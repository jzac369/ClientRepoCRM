/* ==========================================================================
   ClientVault — firebase-config.js

   Tieto hodnoty NIE SÚ tajné — Firebase config je identifikátor projektu,
   nie heslo ani API kľúč v zmysle "secret". Skutočná ochrana dát stojí na:
     1) Firestore Security Rules (firestore.rules) — kto môže čítať/písať
     2) Vault passphrase (vault.js) — šifrovanie citlivých polí v prehliadači

   Vyplň podľa Firebase Console → Project settings → Your apps → SDK setup.
   ========================================================================== */

const firebaseConfig = {
  apiKey: "VLOZ_SEM_API_KEY",
  authDomain: "VLOZ_SEM_PROJECT.firebaseapp.com",
  projectId: "VLOZ_SEM_PROJECT_ID",
  storageBucket: "VLOZ_SEM_PROJECT.firebasestorage.app",
  messagingSenderId: "VLOZ_SEM_SENDER_ID",
  appId: "VLOZ_SEM_APP_ID",
};
