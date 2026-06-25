/* ==========================================================================
   ClientVault — firebase-config.js

   Tieto hodnoty NIE SÚ tajné — Firebase config je identifikátor projektu,
   nie heslo ani API kľúč v zmysle "secret". Skutočná ochrana dát stojí na:
     1) Firestore Security Rules (firestore.rules) — kto môže čítať/písať
     2) Vault passphrase (vault.js) — šifrovanie citlivých polí v prehliadači

   Vyplň podľa Firebase Console → Project settings → Your apps → SDK setup.
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyB-BvFFFMuV_t-b0Ew5QXHf1p8LMHERbW8",
  authDomain: "clientvault-crm-a6f3e.firebaseapp.com",
  projectId: "clientvault-crm-a6f3e",
  storageBucket: "clientvault-crm-a6f3e.firebasestorage.app",
  messagingSenderId: "508636754269",
  appId: "1:508636754269:web:050563135a4261569078b4",
  measurementId: "G-GP8QXLQQ82",
};
