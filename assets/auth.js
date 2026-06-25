/* ==========================================================================
   ClientVault — auth.js (index.html)
   Prihlásenie cez Firebase Authentication (email + heslo).
   Registrácia nových účtov je úmyselne VYPNUTÁ v UI — nový používateľ sa
   vytvára len ručne vo Firebase Console, aby sa do CRM nikto nemohol
   sám "zaregistrovať".
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById("loginForm");
const loginMsg = document.getElementById("loginMsg");
const loginBtn = document.getElementById("loginBtn");
const forgotBtn = document.getElementById("forgotBtn");

// Ak je už používateľ prihlásený, presmeruj priamo do appky.
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "./app.html";
  }
});

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  loginMsg.textContent = "";
  loginMsg.className = "form-msg";
  loginBtn.disabled = true;
  loginBtn.textContent = "Prihlasujem…";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // presmerovanie zariadi onAuthStateChanged
  } catch (err) {
    loginMsg.classList.add("error");
    loginMsg.textContent = mapAuthError(err.code);
    loginBtn.disabled = false;
    loginBtn.textContent = "Prihlásiť sa";
  }
});

forgotBtn?.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  if (!email) {
    loginMsg.classList.add("error");
    loginMsg.textContent = "Najprv zadaj e-mail, potom klikni na obnovu hesla.";
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    loginMsg.classList.remove("error");
    loginMsg.classList.add("ok");
    loginMsg.textContent = "Odoslali sme link na obnovu hesla na " + email + ".";
  } catch (err) {
    loginMsg.classList.add("error");
    loginMsg.textContent = mapAuthError(err.code);
  }
});

function mapAuthError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "Neplatný formát e-mailu.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Nesprávny e-mail alebo heslo.";
    case "auth/too-many-requests":
      return "Príliš veľa pokusov. Skús to o chvíľu znova.";
    case "auth/network-request-failed":
      return "Problém so sieťovým pripojením.";
    default:
      return "Prihlásenie sa nepodarilo (" + (code || "neznáma chyba") + ").";
  }
}
