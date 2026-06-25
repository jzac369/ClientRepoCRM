import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const statusLabels = {
  lead: "Lead",
  planned: "Plánuje sa",
  "in-progress": "Rozpracované",
  review: "Na schválení",
  live: "Beží",
  support: "Support",
};

const priorityLabels = {
  low: "Nízka",
  medium: "Stredná",
  high: "Vysoká",
  urgent: "Urgent",
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(
  (value) => value && !String(value).startsWith("YOUR_")
);

const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = hasFirebaseConfig ? getAuth(app) : null;
const db = hasFirebaseConfig ? getFirestore(app) : null;

const demoProjects = [
  {
    id: "demo-aurora",
    ownerId: "preview-user",
    ownerEmail: "ukazka@clientvault.local",
    name: "Studio Aurora",
    serviceType: "Firemný web",
    status: "live",
    priority: "medium",
    tags: "wordpress, retainer, SEO",
    projectUrl: "https://studioaurora.sk",
    adminUrl: "https://studioaurora.sk/wp-admin",
    stagingUrl: "https://staging.studioaurora.sk",
    repoUrl: "https://github.com/demo/studio-aurora",
    techStack: "WordPress, custom theme, GA4",
    clientName: "Jana Nováková",
    clientEmail: "jana@studioaurora.sk",
    clientPhone: "+421 900 123 456",
    budget: "1600",
    recurringFee: "180",
    nextDeadline: "2026-07-08",
    renewalDate: "2026-07-19",
    hostingProvider: "Websupport",
    importantLinks: "Analytics - https://analytics.google.com\nFigma - https://figma.com/demo",
    notes: "Klient chce v júli doplniť referencie a upraviť titulnú sekciu.",
    credentialVault: null,
    createdAt: "2026-06-12T09:30:00.000Z",
    updatedAt: "2026-06-25T08:40:00.000Z",
  },
  {
    id: "demo-pine",
    ownerId: "preview-user",
    ownerEmail: "ukazka@clientvault.local",
    name: "Pine Legal",
    serviceType: "Redizajn webu",
    status: "review",
    priority: "high",
    tags: "figma, redesign, copywriting",
    projectUrl: "https://pinelegal.sk",
    adminUrl: "https://pinelegal.sk/admin",
    stagingUrl: "https://preview.pinelegal.sk",
    repoUrl: "https://github.com/demo/pine-legal",
    techStack: "Next.js, Firebase Hosting",
    clientName: "Martin Kováč",
    clientEmail: "martin@pinelegal.sk",
    clientPhone: "+421 905 222 111",
    budget: "2400",
    recurringFee: "0",
    nextDeadline: "2026-06-29",
    renewalDate: "2026-11-14",
    hostingProvider: "Vercel",
    importantLinks: "Obsah - https://docs.google.com/demo\nPrávne texty - interný podklad",
    notes: "Čaká sa na finálne schválenie homepagovej hero sekcie.",
    credentialVault: null,
    createdAt: "2026-06-03T11:10:00.000Z",
    updatedAt: "2026-06-24T17:55:00.000Z",
  },
  {
    id: "demo-luna",
    ownerId: "preview-user",
    ownerEmail: "ukazka@clientvault.local",
    name: "Luna Medispa",
    serviceType: "Mesačný support",
    status: "support",
    priority: "urgent",
    tags: "support, ads, analytics",
    projectUrl: "https://lunamedispa.sk",
    adminUrl: "https://lunamedispa.sk/wp-admin",
    stagingUrl: "",
    repoUrl: "https://github.com/demo/luna-medispa",
    techStack: "WordPress, Meta Pixel, Hotjar",
    clientName: "Petra Ďuricová",
    clientEmail: "petra@lunamedispa.sk",
    clientPhone: "+421 948 888 777",
    budget: "0",
    recurringFee: "220",
    nextDeadline: "2026-06-27",
    renewalDate: "2026-07-01",
    hostingProvider: "Hostinger",
    importantLinks: "Meta Ads - https://business.facebook.com\nSearch Console - https://search.google.com/search-console",
    notes: "Treba skontrolovať formulár rezervácií a zálohovanie pred víkendom.",
    credentialVault: null,
    createdAt: "2026-05-26T13:20:00.000Z",
    updatedAt: "2026-06-25T07:20:00.000Z",
  },
];

const state = {
  user: null,
  projects: [],
  selectedId: null,
  vaultKey: "",
  previewMode: false,
  formRenderVersion: 0,
  lastDecryptErrorProjectId: null,
  unsubscribeProjects: null,
  filters: {
    search: "",
    status: "all",
    priority: "all",
  },
};

const dom = {
  authSection: document.querySelector("#authSection"),
  appSection: document.querySelector("#appSection"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  previewDashboardBtn: document.querySelector("#previewDashboardBtn"),
  supportText: document.querySelector("#supportText"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  priorityFilter: document.querySelector("#priorityFilter"),
  logoutBtn: document.querySelector("#logoutBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  unlockVaultBtn: document.querySelector("#unlockVaultBtn"),
  lockVaultBtn: document.querySelector("#lockVaultBtn"),
  vaultPassphrase: document.querySelector("#vaultPassphrase"),
  metricTotal: document.querySelector("#metricTotal"),
  metricActive: document.querySelector("#metricActive"),
  metricUrgent: document.querySelector("#metricUrgent"),
  metricRenewals: document.querySelector("#metricRenewals"),
  projectList: document.querySelector("#projectList"),
  userEmail: document.querySelector("#userEmail"),
  projectForm: document.querySelector("#projectForm"),
  editorTitle: document.querySelector("#editorTitle"),
  deleteProjectBtn: document.querySelector("#deleteProjectBtn"),
  newProjectBtn: document.querySelector("#newProjectBtn"),
  resetFormBtn: document.querySelector("#resetFormBtn"),
  removeSavedSecrets: document.querySelector("#removeSavedSecrets"),
  toast: document.querySelector("#toast"),
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

boot();

async function boot() {
  bindEvents();

  if (!hasFirebaseConfig) {
    dom.loginForm.querySelector('button[type="submit"]').disabled = true;
    dom.supportText.textContent =
      "Prihlásenie sa aktivuje po doplnení Firebase konfigurácie. Kým ju nenastavíš, môžeš si pozrieť ukážku dashboardu.";
    return;
  }

  await setPersistence(auth, browserLocalPersistence);
  onAuthStateChanged(auth, async (user) => {
    state.previewMode = false;
    state.user = user;
    toggleSections(Boolean(user));

    if (!user) {
      resetSessionState();
      render();
      return;
    }

    dom.userEmail.textContent = user.email ?? user.uid;
    subscribeProjects(user.uid);
  });
}

function bindEvents() {
  dom.loginForm.addEventListener("submit", handleLogin);
  dom.previewDashboardBtn.addEventListener("click", enterPreviewMode);
  dom.logoutBtn.addEventListener("click", handleLogout);
  dom.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    render();
  });
  dom.statusFilter.addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    render();
  });
  dom.priorityFilter.addEventListener("change", (event) => {
    state.filters.priority = event.target.value;
    render();
  });
  dom.projectForm.addEventListener("submit", handleSaveProject);
  dom.newProjectBtn.addEventListener("click", startNewProject);
  dom.resetFormBtn.addEventListener("click", () => populateProjectForm(null));
  dom.deleteProjectBtn.addEventListener("click", handleDeleteProject);
  dom.exportBtn.addEventListener("click", exportProjects);
  dom.unlockVaultBtn.addEventListener("click", unlockVault);
  dom.lockVaultBtn.addEventListener("click", lockVault);
}

function resetSessionState() {
  state.projects = [];
  state.selectedId = null;
  state.vaultKey = "";
  state.previewMode = false;
  state.lastDecryptErrorProjectId = null;
  dom.userEmail.textContent = "-";
  dom.vaultPassphrase.value = "";
  if (state.unsubscribeProjects) {
    state.unsubscribeProjects();
    state.unsubscribeProjects = null;
  }
}

function enterPreviewMode() {
  if (state.unsubscribeProjects) {
    state.unsubscribeProjects();
    state.unsubscribeProjects = null;
  }

  state.previewMode = true;
  state.user = {
    uid: "preview-user",
    email: "ukazka@clientvault.local",
  };
  state.projects = cloneProjects(demoProjects);
  state.selectedId = state.projects[0]?.id ?? null;
  dom.userEmail.textContent = "Ukážka dashboardu";
  toggleSections(true);
  render();
  showToast("Zobrazená ukážka dashboardu.");
}

function toggleSections(isAuthenticated) {
  dom.authSection.classList.toggle("hidden", isAuthenticated);
  dom.appSection.classList.toggle("hidden", !isAuthenticated);
}

async function handleLogin(event) {
  event.preventDefault();

  if (!hasFirebaseConfig) {
    showToast("Najprv doplň Firebase konfiguráciu alebo otvor ukážku dashboardu.", true);
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, dom.loginEmail.value, dom.loginPassword.value);
    dom.loginPassword.value = "";
    showToast("Prihlásenie úspešné.");
  } catch (error) {
    showToast(mapFirebaseError(error), true);
  }
}

async function handleLogout() {
  if (state.previewMode) {
    state.user = null;
    resetSessionState();
    toggleSections(false);
    render();
    showToast("Ukážka bola zatvorená.");
    return;
  }

  try {
    await signOut(auth);
    showToast("Odhlásené.");
  } catch (error) {
    showToast(mapFirebaseError(error), true);
  }
}

function subscribeProjects(uid) {
  if (state.unsubscribeProjects) {
    state.unsubscribeProjects();
  }

  const projectsQuery = query(collection(db, "projects"), where("ownerId", "==", uid));
  state.unsubscribeProjects = onSnapshot(
    projectsQuery,
    (snapshot) => {
      state.projects = sortProjects(
        snapshot.docs.map((projectDoc) => ({ id: projectDoc.id, ...projectDoc.data() }))
      );

      if (!state.selectedId && state.projects.length > 0) {
        state.selectedId = state.projects[0].id;
      }

      if (state.selectedId && !state.projects.some((project) => project.id === state.selectedId)) {
        state.selectedId = state.projects[0]?.id ?? null;
      }

      render();
    },
    (error) => showToast(mapFirebaseError(error), true)
  );
}

function render() {
  renderMetrics();
  renderProjectList();
  populateProjectForm(getSelectedProject());
}

function renderMetrics() {
  const projects = state.projects;
  const activeStatuses = new Set(["planned", "in-progress", "review", "live", "support"]);
  const urgentCount = projects.filter((project) =>
    ["high", "urgent"].includes(project.priority ?? "medium")
  ).length;
  const renewalCount = projects.filter((project) => isDateWithinNextDays(project.renewalDate, 30)).length;
  const activeCount = projects.filter((project) => activeStatuses.has(project.status)).length;

  dom.metricTotal.textContent = String(projects.length);
  dom.metricActive.textContent = String(activeCount);
  dom.metricUrgent.textContent = String(urgentCount);
  dom.metricRenewals.textContent = String(renewalCount);
}

function renderProjectList() {
  const projects = getFilteredProjects();

  if (projects.length === 0) {
    dom.projectList.innerHTML =
      '<div class="empty-state">Zatiaľ tu nič nie je. Vytvor prvý projekt alebo uprav filtre.</div>';
    return;
  }

  dom.projectList.innerHTML = projects
    .map((project) => {
      const tags = normalizeTags(project.tags ?? "");
      const deadline = formatDate(project.nextDeadline);
      const renewal = formatDate(project.renewalDate);

      return `
        <article class="project-card ${project.id === state.selectedId ? "is-active" : ""}" data-project-id="${project.id}">
          <div class="project-card-head">
            <div>
              <h3>${escapeHtml(project.name ?? "Bez názvu")}</h3>
              <p class="project-meta">${escapeHtml(project.clientName ?? "Bez klienta")}</p>
            </div>
            <span class="badge">${escapeHtml(statusLabels[project.status] ?? "Neznámy stav")}</span>
          </div>
          <div class="badge-row">
            <span class="badge">${escapeHtml(priorityLabels[project.priority] ?? "Stredná")}</span>
            ${
              project.serviceType
                ? `<span class="badge">${escapeHtml(project.serviceType)}</span>`
                : ""
            }
          </div>
          <p class="project-meta">
            ${project.projectUrl ? escapeHtml(project.projectUrl) : "Bez hlavnej lokality"}<br />
            ${deadline ? `Deadline: ${escapeHtml(deadline)}` : "Deadline nie je nastavený"}<br />
            ${renewal ? `Obnova: ${escapeHtml(renewal)}` : "Obnova nie je nastavená"}
          </p>
          <div class="tag-row">
            ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
        </article>
      `;
    })
    .join("");

  dom.projectList.querySelectorAll("[data-project-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.getAttribute("data-project-id");
      render();
    });
  });
}

async function populateProjectForm(project) {
  const renderVersion = ++state.formRenderVersion;
  dom.projectForm.reset();
  dom.removeSavedSecrets.checked = false;
  dom.deleteProjectBtn.classList.toggle("hidden", !project);

  if (!project) {
    dom.editorTitle.textContent = "Nový projekt";
    state.lastDecryptErrorProjectId = null;
    return;
  }

  dom.editorTitle.textContent = project.name ?? "Detail projektu";

  setFormValue("name", project.name);
  setFormValue("serviceType", project.serviceType);
  setFormValue("status", project.status ?? "lead");
  setFormValue("priority", project.priority ?? "medium");
  setFormValue("tags", project.tags);
  setFormValue("projectUrl", project.projectUrl);
  setFormValue("adminUrl", project.adminUrl);
  setFormValue("stagingUrl", project.stagingUrl);
  setFormValue("repoUrl", project.repoUrl);
  setFormValue("techStack", project.techStack);
  setFormValue("clientName", project.clientName);
  setFormValue("clientEmail", project.clientEmail);
  setFormValue("clientPhone", project.clientPhone);
  setFormValue("budget", project.budget);
  setFormValue("recurringFee", project.recurringFee);
  setFormValue("nextDeadline", project.nextDeadline);
  setFormValue("renewalDate", project.renewalDate);
  setFormValue("hostingProvider", project.hostingProvider);
  setFormValue("importantLinks", project.importantLinks);
  setFormValue("notes", project.notes);

  if (project.credentialVault && state.vaultKey) {
    try {
      const secrets = await decryptPayload(project.credentialVault, state.vaultKey);
      if (renderVersion !== state.formRenderVersion) {
        return;
      }
      state.lastDecryptErrorProjectId = null;
      setFormValue("adminUsername", secrets.adminUsername);
      setFormValue("adminPassword", secrets.adminPassword);
      setFormValue("hostingUsername", secrets.hostingUsername);
      setFormValue("hostingPassword", secrets.hostingPassword);
    } catch (error) {
      if (state.lastDecryptErrorProjectId !== project.id) {
        showToast("Vault kľúč nesedí na tento záznam alebo sú dáta poškodené.", true);
      }
      state.lastDecryptErrorProjectId = project.id;
    }
  }
}

function startNewProject() {
  state.selectedId = null;
  populateProjectForm(null);
}

async function handleSaveProject(event) {
  event.preventDefault();

  if (!state.user) {
    showToast("Najprv sa prihlás.", true);
    return;
  }

  const selectedProject = getSelectedProject();
  const formData = new FormData(dom.projectForm);
  const payload = normalizePayload(formData);
  let credentialVault = selectedProject?.credentialVault ?? null;

  const secrets = {
    adminUsername: payload.adminUsername,
    adminPassword: payload.adminPassword,
    hostingUsername: payload.hostingUsername,
    hostingPassword: payload.hostingPassword,
  };

  const hasSecrets = Object.values(secrets).some((value) => value);
  if (payload.removeSavedSecrets) {
    credentialVault = null;
  } else if (hasSecrets) {
    if (!state.vaultKey) {
      showToast("Najprv odomkni vault kľúč, až potom ukladaj citlivé prístupy.", true);
      return;
    }

    credentialVault = await encryptPayload(secrets, state.vaultKey);
  }

  const documentPayload = {
    ownerId: state.user.uid,
    ownerEmail: state.user.email ?? "",
    name: payload.name,
    serviceType: payload.serviceType,
    status: payload.status,
    priority: payload.priority,
    tags: payload.tags,
    projectUrl: payload.projectUrl,
    adminUrl: payload.adminUrl,
    stagingUrl: payload.stagingUrl,
    repoUrl: payload.repoUrl,
    techStack: payload.techStack,
    clientName: payload.clientName,
    clientEmail: payload.clientEmail,
    clientPhone: payload.clientPhone,
    budget: payload.budget,
    recurringFee: payload.recurringFee,
    nextDeadline: payload.nextDeadline,
    renewalDate: payload.renewalDate,
    hostingProvider: payload.hostingProvider,
    importantLinks: payload.importantLinks,
    notes: payload.notes,
    credentialVault,
    updatedAt: state.previewMode ? new Date().toISOString() : serverTimestamp(),
  };

  if (state.previewMode) {
    savePreviewProject(selectedProject, documentPayload);
    return;
  }

  try {
    if (selectedProject) {
      await updateDoc(doc(db, "projects", selectedProject.id), documentPayload);
      showToast("Projekt bol aktualizovaný.");
    } else {
      const projectRef = await addDoc(collection(db, "projects"), {
        ...documentPayload,
        createdAt: serverTimestamp(),
      });
      state.selectedId = projectRef.id;
      showToast("Projekt bol vytvorený.");
    }
  } catch (error) {
    showToast(mapFirebaseError(error), true);
  }
}

function savePreviewProject(selectedProject, documentPayload) {
  if (selectedProject) {
    state.projects = sortProjects(
      state.projects.map((project) =>
        project.id === selectedProject.id ? { ...project, ...documentPayload } : project
      )
    );
    showToast("Ukážkový projekt bol aktualizovaný.");
  } else {
    const id = crypto.randomUUID ? crypto.randomUUID() : `preview-${Date.now()}`;
    state.projects = sortProjects([
      {
        id,
        ...documentPayload,
        createdAt: new Date().toISOString(),
      },
      ...state.projects,
    ]);
    state.selectedId = id;
    showToast("Ukážkový projekt bol vytvorený.");
  }

  render();
}

async function handleDeleteProject() {
  const project = getSelectedProject();
  if (!project) {
    return;
  }

  const shouldDelete = window.confirm(`Naozaj chceš zmazať projekt "${project.name}"?`);
  if (!shouldDelete) {
    return;
  }

  if (state.previewMode) {
    state.projects = state.projects.filter((item) => item.id !== project.id);
    state.selectedId = state.projects[0]?.id ?? null;
    render();
    showToast("Ukážkový projekt bol zmazaný.");
    return;
  }

  try {
    await deleteDoc(doc(db, "projects", project.id));
    state.selectedId = null;
    showToast("Projekt bol zmazaný.");
  } catch (error) {
    showToast(mapFirebaseError(error), true);
  }
}

function exportProjects() {
  const payload = {
    exportedAt: new Date().toISOString(),
    count: getFilteredProjects().length,
    projects: getFilteredProjects(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `client-project-crm-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Export bol pripravený.");
}

function unlockVault() {
  const passphrase = dom.vaultPassphrase.value.trim();
  if (!passphrase) {
    showToast("Zadaj vault kľúč.", true);
    return;
  }

  state.vaultKey = passphrase;
  state.lastDecryptErrorProjectId = null;
  showToast("Vault je odomknutý v tejto relácii.");
  populateProjectForm(getSelectedProject());
}

function lockVault() {
  state.vaultKey = "";
  state.lastDecryptErrorProjectId = null;
  dom.vaultPassphrase.value = "";
  populateProjectForm(getSelectedProject());
  showToast("Vault bol zamknutý.");
}

function getFilteredProjects() {
  const { search, status, priority } = state.filters;

  return sortProjects(state.projects).filter((project) => {
    const matchesSearch =
      !search ||
      [
        project.name,
        project.clientName,
        project.clientEmail,
        project.projectUrl,
        project.repoUrl,
        project.tags,
        project.notes,
        project.serviceType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);

    const matchesStatus = status === "all" || project.status === status;
    const matchesPriority = priority === "all" || project.priority === priority;

    return matchesSearch && matchesStatus && matchesPriority;
  });
}

function getSelectedProject() {
  return state.projects.find((project) => project.id === state.selectedId) ?? null;
}

function normalizePayload(formData) {
  return {
    name: clean(formData.get("name")),
    serviceType: clean(formData.get("serviceType")),
    status: clean(formData.get("status")) || "lead",
    priority: clean(formData.get("priority")) || "medium",
    tags: clean(formData.get("tags")),
    projectUrl: clean(formData.get("projectUrl")),
    adminUrl: clean(formData.get("adminUrl")),
    stagingUrl: clean(formData.get("stagingUrl")),
    repoUrl: clean(formData.get("repoUrl")),
    techStack: clean(formData.get("techStack")),
    clientName: clean(formData.get("clientName")),
    clientEmail: clean(formData.get("clientEmail")),
    clientPhone: clean(formData.get("clientPhone")),
    budget: clean(formData.get("budget")),
    recurringFee: clean(formData.get("recurringFee")),
    nextDeadline: clean(formData.get("nextDeadline")),
    renewalDate: clean(formData.get("renewalDate")),
    hostingProvider: clean(formData.get("hostingProvider")),
    importantLinks: clean(formData.get("importantLinks")),
    notes: clean(formData.get("notes")),
    adminUsername: clean(formData.get("adminUsername")),
    adminPassword: clean(formData.get("adminPassword")),
    hostingUsername: clean(formData.get("hostingUsername")),
    hostingPassword: clean(formData.get("hostingPassword")),
    removeSavedSecrets: Boolean(formData.get("removeSavedSecrets")),
  };
}

function sortProjects(projects) {
  return [...projects].sort((left, right) => timestampToMs(right.updatedAt) - timestampToMs(left.updatedAt));
}

function cloneProjects(projects) {
  return projects.map((project) => structuredClone(project));
}

function clean(value) {
  return String(value ?? "").trim();
}

function setFormValue(name, value) {
  const field = dom.projectForm.elements.namedItem(name);
  if (field) {
    field.value = value ?? "";
  }
}

function normalizeTags(rawTags) {
  return clean(rawTags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function isDateWithinNextDays(dateString, days) {
  if (!dateString) {
    return false;
  }

  const today = new Date();
  const target = new Date(dateString);
  const difference = target.getTime() - today.getTime();
  const max = days * 24 * 60 * 60 * 1000;
  return difference >= 0 && difference <= max;
}

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

function timestampToMs(timestamp) {
  if (!timestamp) {
    return 0;
  }

  if (typeof timestamp.toMillis === "function") {
    return timestamp.toMillis();
  }

  return new Date(timestamp).getTime() || 0;
}

async function encryptPayload(data, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(data))
  );

  return {
    algorithm: "AES-GCM",
    version: 1,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    cipher: bytesToBase64(new Uint8Array(encrypted)),
  };
}

async function decryptPayload(payload, passphrase) {
  const key = await deriveEncryptionKey(passphrase, base64ToBytes(payload.salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.cipher)
  );

  return JSON.parse(decoder.decode(decrypted));
}

async function deriveEncryptionKey(passphrase, salt) {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 210000,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function mapFirebaseError(error) {
  const message = error?.message ?? "";

  if (message.includes("auth/invalid-credential")) {
    return "Nesprávny email alebo heslo.";
  }

  if (message.includes("permission-denied")) {
    return "Firebase pravidlá aktuálne nepovolili túto operáciu.";
  }

  if (message.includes("network-request-failed")) {
    return "Nepodarilo sa spojiť s Firebase. Skontroluj konfiguráciu a internet.";
  }

  return message || "Nastala neočakávaná chyba.";
}

function showToast(message, isError = false) {
  dom.toast.textContent = message;
  dom.toast.classList.remove("hidden");
  dom.toast.style.background = isError ? "rgba(132, 64, 35, 0.94)" : "rgba(49, 38, 31, 0.92)";
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    dom.toast.classList.add("hidden");
  }, 3600);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
