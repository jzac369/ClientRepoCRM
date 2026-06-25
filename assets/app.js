/* ==========================================================================
   ClientVault — app.js (app.html)
   CRUD projektov, dashboard štatistiky, filtrovanie, šifrovaný trezor,
   úlohy, aktivity log, dôležité linky, export.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let projects = [];
let unsubscribeSnapshot = null;

let activeStatusFilter = "all";
let searchTerm = "";
let editingProjectId = null; // null = create mode

const STATUS_META = {
  dopyt:        { label: "Dopyt",         badge: "status-dopyt" },
  realizacia:   { label: "V realizácii",  badge: "status-realizacia" },
  dokoncene:    { label: "Dokončené",     badge: "status-dokoncene" },
  udrzba:       { label: "Údržba",        badge: "status-udrzba" },
  pozastavene:  { label: "Pozastavené",   badge: "status-pozastavene" },
};

/* ---------------------------------------------------------------- AUTH ---- */

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "./index.html";
    return;
  }
  currentUser = user;
  document.getElementById("userEmail").textContent = user.email;
  startListening();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  Vault.clearSession();
  await signOut(auth);
});

/* ----------------------------------------------------------- FIRESTORE ---- */

function startListening() {
  const q = query(collection(db, "projects"), where("ownerId", "==", currentUser.uid));
  unsubscribeSnapshot = onSnapshot(q, (snap) => {
    projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAll();
  }, (err) => {
    toast("Chyba pri načítaní projektov: " + err.message, "error");
  });
}

async function saveProject(data, id) {
  const payload = { ...data, ownerId: currentUser.uid, updatedAt: serverTimestamp() };
  if (id) {
    await updateDoc(doc(db, "projects", id), payload);
  } else {
    payload.createdAt = serverTimestamp();
    payload.checklist = payload.checklist || [];
    payload.activityLog = payload.activityLog || [];
    payload.importantLinks = payload.importantLinks || [];
    await addDoc(collection(db, "projects"), payload);
  }
}

async function removeProject(id) {
  await deleteDoc(doc(db, "projects", id));
}

/* ------------------------------------------------------------- HELPERS ---- */

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  return Math.round((target - today) / 86400000);
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function toast(msg, kind = "ok") {
  const stack = document.getElementById("toastStack");
  const el = document.createElement("div");
  el.className = "toast " + kind;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

/* --------------------------------------------------------- DASHBOARD ---- */

function renderAll() {
  renderStats();
  renderPulse();
  renderGrid();
}

function renderStats() {
  const active = projects.filter(p => ["dopyt","realizacia","udrzba"].includes(p.status)).length;
  const pendingPayment = projects.filter(p => p.paymentStatus === "caka").length;

  const upcomingDeadlines = projects
    .map(p => ({ p, d: daysUntil(p.deadline) }))
    .filter(x => x.d !== null && x.d >= 0)
    .sort((a,b) => a.d - b.d);

  const expiringDomains = projects.filter(p => {
    const d = daysUntil(p.domainExpiry);
    return d !== null && d >= 0 && d <= 30;
  }).length;

  document.getElementById("statActive").textContent = active;
  document.getElementById("statPending").textContent = pendingPayment;
  document.getElementById("statPending").className = "stat-value" + (pendingPayment > 0 ? " warn" : " good");
  document.getElementById("statDeadline").textContent = upcomingDeadlines.length
    ? fmtDate(upcomingDeadlines[0].p.deadline) : "—";
  document.getElementById("statExpiring").textContent = expiringDomains;
  document.getElementById("statExpiring").className = "stat-value" + (expiringDomains > 0 ? " alert" : " good");
}

function renderPulse() {
  const total = projects.length;
  const overdue = projects.filter(p => {
    const d = daysUntil(p.deadline);
    return d !== null && d < 0 && p.status !== "dokoncene";
  }).length;
  const pct = total === 0 ? 100 : Math.round(((total - overdue) / total) * 100);

  const ring = document.getElementById("pulseRing");
  ring.style.setProperty("--pct", pct);
  document.getElementById("pulseRingValue").textContent = pct + "%";
  document.getElementById("pulseSummaryText").innerHTML = overdue > 0
    ? `<strong>${overdue} projekt${overdue === 1 ? "" : "y"} po termíne</strong><span class="warn">vyžaduje pozornosť</span>`
    : `<strong>Všetko pod kontrolou</strong><span class="ok">žiadne zmeškané termíny</span>`;

  const items = [];
  projects.forEach(p => {
    const dd = daysUntil(p.deadline);
    if (dd !== null && p.status !== "dokoncene") {
      items.push({ name: p.name, sub: "termín", days: dd, kind: dd < 0 ? "warn" : dd <= 7 ? "pending" : "ok" });
    }
    const de = daysUntil(p.domainExpiry);
    if (de !== null) {
      items.push({ name: p.name, sub: "doména/hosting", days: de, kind: de < 0 ? "warn" : de <= 30 ? "pending" : "ok" });
    }
  });
  items.sort((a,b) => a.days - b.days);

  const list = document.getElementById("pulseList");
  list.innerHTML = "";
  if (items.length === 0) {
    list.innerHTML = `<p class="helper-text">Žiadne sledované termíny zatiaľ nie sú nastavené.</p>`;
    return;
  }
  items.slice(0, 6).forEach(it => {
    const row = document.createElement("div");
    row.className = "preview-row";
    const dotIcon = it.kind === "warn" ? "✕" : it.kind === "pending" ? "!" : "✓";
    const dayLabel = it.days < 0 ? `${Math.abs(it.days)} dní po` : it.days === 0 ? "dnes" : `za ${it.days} dní`;
    row.innerHTML = `
      <span class="row-dot ${it.kind}">${dotIcon}</span>
      <span class="name">${escapeHtml(it.name)} — ${it.sub}</span>
      <span class="time">${dayLabel}</span>`;
    list.appendChild(row);
  });
}

function renderGrid() {
  const grid = document.getElementById("projectGrid");
  const term = searchTerm.trim().toLowerCase();

  let filtered = projects.filter(p => {
    if (activeStatusFilter !== "all" && p.status !== activeStatusFilter) return false;
    if (term) {
      const hay = [p.name, p.client, ...(p.techTags||[])].join(" ").toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });

  filtered.sort((a,b) => (a.name||"").localeCompare(b.name||""));

  grid.innerHTML = "";
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="emoji">🗂️</div><p>Žiadne projekty nezodpovedajú filtru.<br>Skús zmeniť vyhľadávanie alebo pridaj nový projekt.</p></div>`;
    return;
  }

  filtered.forEach(p => {
    const meta = STATUS_META[p.status] || STATUS_META.dopyt;
    const dd = daysUntil(p.deadline);
    let deadlineClass = "";
    if (dd !== null) {
      if (dd < 0) deadlineClass = "overdue";
      else if (dd <= 7) deadlineClass = "soon";
    }
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <div class="project-card-top">
        <div>
          <h4>${escapeHtml(p.name || "Bez názvu")}</h4>
          <div class="project-client">${escapeHtml(p.client || "—")}</div>
        </div>
        <span class="badge ${meta.badge}">${meta.label}</span>
      </div>
      <div class="tag-row">${(p.techTags||[]).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      <div class="project-links">
        ${p.websiteUrl ? `<a class="link-pill" href="${escapeHtml(p.websiteUrl)}" target="_blank" rel="noopener">🌐 Web</a>` : ""}
        ${p.githubUrl ? `<a class="link-pill" href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener">⌥ GitHub</a>` : ""}
        ${p.adminUrl ? `<a class="link-pill" href="${escapeHtml(p.adminUrl)}" target="_blank" rel="noopener">🔑 Admin</a>` : ""}
      </div>
      ${p.deadline ? `<div class="project-deadline ${deadlineClass}">📅 Termín: ${fmtDate(p.deadline)}</div>` : ""}
      <div class="project-card-actions">
        <button class="btn btn-ghost btn-small" data-edit="${p.id}">Otvoriť</button>
        <button class="btn btn-danger btn-small" data-delete="${p.id}">Vymazať</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openModal(b.dataset.edit)));
  grid.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => confirmDelete(b.dataset.delete)));
}

/* ------------------------------------------------------------- FILTERS ---- */

document.getElementById("searchInput").addEventListener("input", (e) => {
  searchTerm = e.target.value;
  renderGrid();
});

document.querySelectorAll("[data-status-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-status-filter]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeStatusFilter = btn.dataset.statusFilter;
    renderGrid();
  });
});

/* --------------------------------------------------------------- MODAL ---- */

const modalOverlay = document.getElementById("modalOverlay");
const modalForm = document.getElementById("modalForm");

document.getElementById("newProjectBtn").addEventListener("click", () => openModal(null));
document.getElementById("modalCloseBtn").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

function openModal(id) {
  editingProjectId = id;
  const p = id ? projects.find(x => x.id === id) : null;

  document.getElementById("modalTitle").textContent = p ? "Upraviť projekt" : "Nový projekt";
  modalForm.reset();
  document.querySelector('.tab-btn[data-tab="zakladne"]').click();

  document.getElementById("f_name").value = p?.name || "";
  document.getElementById("f_client").value = p?.client || "";
  document.getElementById("f_contact").value = p?.contact || "";
  document.getElementById("f_status").value = p?.status || "dopyt";
  document.getElementById("f_priority").value = p?.priority || "medium";
  document.getElementById("f_price").value = p?.price || "";
  document.getElementById("f_paymentStatus").value = p?.paymentStatus || "caka";
  document.getElementById("f_startDate").value = p?.startDate || "";
  document.getElementById("f_deadline").value = p?.deadline || "";
  document.getElementById("f_domainExpiry").value = p?.domainExpiry || "";
  document.getElementById("f_techTags").value = (p?.techTags || []).join(", ");
  document.getElementById("f_websiteUrl").value = p?.websiteUrl || "";
  document.getElementById("f_githubUrl").value = p?.githubUrl || "";
  document.getElementById("f_adminUrl").value = p?.adminUrl || "";
  document.getElementById("f_notes").value = p?.notes || "";

  renderLinksList(p?.importantLinks || []);
  renderChecklist(p?.checklist || []);
  renderLog(p?.activityLog || []);
  renderVaultTab(p);

  modalOverlay.style.display = "flex";
}

function closeModal() {
  modalOverlay.style.display = "none";
  editingProjectId = null;
}

modalForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById("saveProjectBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Ukladám…";

  try {
    const data = {
      name: document.getElementById("f_name").value.trim(),
      client: document.getElementById("f_client").value.trim(),
      contact: document.getElementById("f_contact").value.trim(),
      status: document.getElementById("f_status").value,
      priority: document.getElementById("f_priority").value,
      price: Number(document.getElementById("f_price").value) || 0,
      paymentStatus: document.getElementById("f_paymentStatus").value,
      startDate: document.getElementById("f_startDate").value,
      deadline: document.getElementById("f_deadline").value,
      domainExpiry: document.getElementById("f_domainExpiry").value,
      techTags: document.getElementById("f_techTags").value.split(",").map(s => s.trim()).filter(Boolean),
      websiteUrl: document.getElementById("f_websiteUrl").value.trim(),
      githubUrl: document.getElementById("f_githubUrl").value.trim(),
      adminUrl: document.getElementById("f_adminUrl").value.trim(),
      notes: document.getElementById("f_notes").value.trim(),
      importantLinks: currentLinks,
      checklist: currentChecklist,
      activityLog: currentLog,
    };

    if (!data.name) throw new Error("Názov projektu je povinný.");

    if (pendingVaultUpdate) {
      data.vault = pendingVaultUpdate;
    } else if (editingProjectId) {
      const existing = projects.find(x => x.id === editingProjectId);
      if (existing?.vault) data.vault = existing.vault;
    }

    await saveProject(data, editingProjectId);
    toast(editingProjectId ? "Projekt uložený." : "Projekt vytvorený.", "ok");
    closeModal();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Uložiť projekt";
  }
});

function confirmDelete(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  if (confirm(`Naozaj vymazať projekt „${p.name}“? Táto akcia sa nedá vrátiť späť.`)) {
    removeProject(id).then(() => toast("Projekt vymazaný.", "ok"));
  }
}

/* -------------------------------------------------------- LINKS TAB ---- */

let currentLinks = [];

function renderLinksList(links) {
  currentLinks = [...links];
  const wrap = document.getElementById("linksList");
  wrap.innerHTML = "";
  currentLinks.forEach((l, idx) => {
    const row = document.createElement("div");
    row.className = "link-item";
    row.innerHTML = `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label || l.url)}</a><button type="button" data-idx="${idx}">✕</button>`;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    currentLinks.splice(Number(b.dataset.idx), 1);
    renderLinksList(currentLinks);
  }));
}

document.getElementById("addLinkBtn").addEventListener("click", () => {
  const label = document.getElementById("newLinkLabel").value.trim();
  const url = document.getElementById("newLinkUrl").value.trim();
  if (!url) return;
  currentLinks.push({ label: label || url, url });
  document.getElementById("newLinkLabel").value = "";
  document.getElementById("newLinkUrl").value = "";
  renderLinksList(currentLinks);
});

/* ----------------------------------------------------- CHECKLIST TAB ---- */

let currentChecklist = [];

function renderChecklist(items) {
  currentChecklist = [...items];
  const wrap = document.getElementById("checklistWrap");
  wrap.innerHTML = "";
  currentChecklist.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "checklist-item";
    row.innerHTML = `
      <input type="checkbox" data-idx="${idx}" ${it.done ? "checked" : ""}>
      <span class="${it.done ? "done" : ""}">${escapeHtml(it.text)}</span>
      <button type="button" data-del="${idx}">Vymazať</button>`;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener("change", () => {
    currentChecklist[Number(cb.dataset.idx)].done = cb.checked;
    renderChecklist(currentChecklist);
  }));
  wrap.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
    currentChecklist.splice(Number(b.dataset.del), 1);
    renderChecklist(currentChecklist);
  }));
}

document.getElementById("addTodoBtn").addEventListener("click", () => {
  const input = document.getElementById("newTodoText");
  const text = input.value.trim();
  if (!text) return;
  currentChecklist.push({ text, done: false });
  input.value = "";
  renderChecklist(currentChecklist);
});

/* ------------------------------------------------------------- LOG TAB ---- */

let currentLog = [];

function renderLog(entries) {
  currentLog = [...entries];
  const wrap = document.getElementById("logWrap");
  wrap.innerHTML = "";
  [...currentLog].reverse().forEach((e) => {
    const row = document.createElement("div");
    row.className = "log-entry";
    row.innerHTML = `<div class="log-date">${escapeHtml(e.date)}</div><div class="log-text">${escapeHtml(e.text)}</div>`;
    wrap.appendChild(row);
  });
  if (currentLog.length === 0) {
    wrap.innerHTML = `<p class="helper-text">Zatiaľ žiadne záznamy.</p>`;
  }
}

document.getElementById("addLogBtn").addEventListener("click", () => {
  const input = document.getElementById("newLogText");
  const text = input.value.trim();
  if (!text) return;
  currentLog.push({ date: new Date().toLocaleDateString("sk-SK"), text });
  input.value = "";
  renderLog(currentLog);
});

/* ------------------------------------------------------------ VAULT TAB ---- */

let pendingVaultUpdate = null;

function renderVaultTab(project) {
  pendingVaultUpdate = null;
  const wrap = document.getElementById("vaultTabBody");

  if (!Vault.isUnlocked()) {
    wrap.innerHTML = `
      <div class="vault-locked">
        <div class="lock-icon">🔒</div>
        <p>Trezor je zamknutý. Zadaj svoju vault passphrase pre zobrazenie alebo úpravu admin prístupov tohto projektu.</p>
        <div class="field">
          <input type="password" id="vaultUnlockInput" placeholder="Vault passphrase">
        </div>
        <button type="button" class="btn btn-primary btn-block" id="vaultUnlockBtn">Odomknúť trezor</button>
        <p class="form-msg error" id="vaultUnlockMsg"></p>
      </div>`;
    document.getElementById("vaultUnlockBtn").addEventListener("click", () => handleUnlock(project));
    return;
  }

  renderVaultUnlockedForm(project);
}

async function handleUnlock(project) {
  const input = document.getElementById("vaultUnlockInput");
  const msg = document.getElementById("vaultUnlockMsg");
  const passphrase = input.value;
  if (!passphrase) return;

  msg.textContent = "";
  const checkRef = doc(db, "vaultMeta", currentUser.uid);
  const checkSnap = await getDoc(checkRef);

  if (!checkSnap.exists()) {
    // Prvé použitie trezoru — vytvoríme kontrolný záznam s touto passphrase.
    const bundle = await Vault.createCheckBundle(passphrase);
    await setDoc(checkRef, bundle);
    Vault.setSessionPassphrase(passphrase);
    toast("Trezor bol prvýkrát nastavený. Túto passphrase si bezpečne zapamätaj — nikde sa neukladá.", "ok");
    renderVaultTab(project);
    return;
  }

  const ok = await Vault.verifyCheckBundle(passphrase, checkSnap.data());
  if (!ok) {
    msg.textContent = "Nesprávna vault passphrase.";
    return;
  }
  Vault.setSessionPassphrase(passphrase);
  renderVaultTab(project);
}

async function renderVaultUnlockedForm(project) {
  const wrap = document.getElementById("vaultTabBody");
  const passphrase = Vault.getSessionPassphrase();

  let adminUser = "";
  let adminPass = "";
  if (project?.vault) {
    try {
      if (project.vault.adminUser) adminUser = await Vault.decrypt(passphrase, project.vault.adminUser);
      if (project.vault.adminPass) adminPass = await Vault.decrypt(passphrase, project.vault.adminPass);
    } catch (e) {
      wrap.innerHTML = `<p class="form-msg error">Nepodarilo sa rozšifrovať údaje — pravdepodobne nesedí passphrase so zvyškom trezoru.</p>`;
      return;
    }
  }

  wrap.innerHTML = `
    <p class="helper-text">🔓 Trezor je odomknutý pre túto session. Údaje nižšie sa pri uložení znova zašifrujú.</p>
    <div class="field">
      <label>Prihlasovacie meno / e-mail do admin zóny</label>
      <input type="text" id="v_adminUser" value="${escapeHtml(adminUser)}" autocomplete="off">
    </div>
    <div class="field">
      <label>Heslo do admin zóny</label>
      <input type="text" id="v_adminPass" value="${escapeHtml(adminPass)}" autocomplete="off">
    </div>
    <button type="button" class="btn btn-ghost btn-small" id="vaultLockBtn">Zamknúť trezor (skryť)</button>
  `;
  document.getElementById("vaultLockBtn").addEventListener("click", () => {
    Vault.clearSession();
    renderVaultTab(project);
  });

  document.getElementById("v_adminUser").addEventListener("input", () => queueVaultUpdate());
  document.getElementById("v_adminPass").addEventListener("input", () => queueVaultUpdate());
}

async function queueVaultUpdate() {
  const passphrase = Vault.getSessionPassphrase();
  const adminUser = document.getElementById("v_adminUser").value;
  const adminPass = document.getElementById("v_adminPass").value;
  pendingVaultUpdate = {
    adminUser: adminUser ? await Vault.encrypt(passphrase, adminUser) : null,
    adminPass: adminPass ? await Vault.encrypt(passphrase, adminPass) : null,
  };
}

/* ------------------------------------------------------------- EXPORT ---- */

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clientvault-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Export stiahnutý. Citlivé údaje ostávajú zašifrované.", "ok");
});

/* -------------------------------------------------------------- THEME ---- */

function initTheme() {
  const saved = localStorage.getItem("cv-theme");
  if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");
}

document.getElementById("themeToggle").addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("cv-theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("cv-theme", "dark");
  }
});

initTheme();
