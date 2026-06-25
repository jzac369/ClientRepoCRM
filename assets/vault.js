/* ==========================================================================
   ClientVault — vault.js
   Klient-side šifrovanie citlivých údajov (admin prihlasovacie údaje).

   Princíp:
   - Heslo do trezoru (vault passphrase) sa NIKDY neukladá ani neposiela.
   - Z passphrase sa odvodí AES-GCM kľúč pomocou PBKDF2 (200 000 iterácií).
   - Každý záznam má svoju vlastnú soľ (salt) a IV — tie sú verejné, nie sú
     tajné, slúžia len na to, aby sa rovnaká passphrase nedala použiť na
     rozlúsknutie viacerých záznamov naraz (rainbow-table ochrana).
   - Bez správnej passphrase sa zašifrovaný obsah NEDÁ prečítať, ani keby
     mal niekto plný prístup k Firestore databáze.
   - Overenie správnosti passphrase ide cez kontrolný záznam meta/vaultCheck,
     ktorý sa pri zlej passphrase nedá rozšifrovať (AES-GCM auth tag fail).
   ========================================================================== */

const Vault = (() => {
  const PBKDF2_ITERATIONS = 200000;
  let cachedKey = null;       // CryptoKey, len v pamäti počas session
  let cachedPassphrase = null; // len v pamäti, na re-deriváciu pri zmene saltu

  function bufToB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  function b64ToBuf(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  function randomBytes(len) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return arr;
  }

  async function deriveKey(passphrase, salt) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /** Zašifruje plaintext (string) → { ciphertext, iv, salt } všetko base64 */
  async function encrypt(passphrase, plaintext) {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = await deriveKey(passphrase, salt);
    const enc = new TextEncoder();
    const cipherBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, enc.encode(plaintext)
    );
    return {
      ciphertext: bufToB64(cipherBuf),
      iv: bufToB64(iv),
      salt: bufToB64(salt),
    };
  }

  /** Rozšifruje { ciphertext, iv, salt } → plaintext string. Throws if wrong passphrase. */
  async function decrypt(passphrase, bundle) {
    const salt = b64ToBuf(bundle.salt);
    const iv = b64ToBuf(bundle.iv);
    const key = await deriveKey(passphrase, salt);
    const cipherBuf = b64ToBuf(bundle.ciphertext);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf);
    return new TextDecoder().decode(plainBuf);
  }

  /** Vytvorí kontrolný "check" bundle pri prvom nastavení trezoru. */
  async function createCheckBundle(passphrase) {
    return encrypt(passphrase, 'vault-check-ok');
  }

  /** Overí, či passphrase sedí na daný check bundle. Vráti true/false. */
  async function verifyCheckBundle(passphrase, bundle) {
    try {
      const result = await decrypt(passphrase, bundle);
      return result === 'vault-check-ok';
    } catch (e) {
      return false;
    }
  }

  function setSessionPassphrase(p) { cachedPassphrase = p; }
  function getSessionPassphrase() { return cachedPassphrase; }
  function clearSession() { cachedPassphrase = null; cachedKey = null; }
  function isUnlocked() { return !!cachedPassphrase; }

  return {
    encrypt,
    decrypt,
    createCheckBundle,
    verifyCheckBundle,
    setSessionPassphrase,
    getSessionPassphrase,
    clearSession,
    isUnlocked,
  };
})();
