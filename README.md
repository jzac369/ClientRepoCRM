# ClientVault — súkromné CRM pre webové projekty

Samostatné CRM na evidenciu klientskych webových projektov: web, GitHub repo,
klient, kontakt, admin prístupy, termíny, úlohy a poznámky — na jednom mieste,
chránené prihlásením a šifrovaným trezorom na citlivé heslá.

## Architektúra

- **Kód** žije v tomto GitHub repozitári, nasadený cez GitHub Pages (alebo Firebase Hosting).
- **Dáta** sú v Cloud Firestore.
- **Vstup do appky** je chránený Firebase Authentication (e-mail + heslo).
- **Citlivé prístupy klientov** (admin login/heslo) sú navyše šifrované AES-GCM
  kľúčom odvodeným z vlastnej passphrase priamo v prehliadači — server (ani
  Firestore) nikdy nevidí passphrase ani nešifrovaný obsah.

## Bezpečnostný model — dve vrstvy

1. **Firestore Security Rules** (`firestore.rules`) — každý projekt má pole
   `ownerId`. Čítať/zapisovať môže len prihlásený účet, ktorému dokument patrí.
   Registrácia nových účtov je v UI vypnutá — nový účet vznikne len ručne
   vo Firebase Console.
2. **Vault passphrase** (`assets/vault.js`) — heslá do admin zón klientov sa
   pred uložením zašifrujú AES-256-GCM, kľúč sa odvodí PBKDF2 (200 000
   iterácií) z passphrase, ktorú poznáš len ty. Passphrase sa nikde neukladá —
   ak ju zabudneš, šifrované údaje sa nedajú obnoviť. Odporúčam si ju uložiť
   do vlastného password manažéra.

## Nastavenie od nuly

### 1. Firebase projekt

1. Vo [Firebase Console](https://console.firebase.google.com/) vytvor nový projekt.
2. **Authentication** → Sign-in method → zapni **Email/Password**.
3. **Authentication** → Users → manuálne vytvor presne jeden účet (tvoj e-mail + heslo).
   Toto je jediný účet, ktorý sa môže prihlásiť.
4. **Firestore Database** → vytvor databázu (production mode).
5. **Project settings** → Your apps → Add app → Web → skopíruj `firebaseConfig`.

### 2. Vyplň konfiguráciu

Otvor `assets/firebase-config.js` a vlož skutočné hodnoty z kroku 1.5.
Tieto hodnoty nie sú tajné — môžu byť verejne v kóde.

### 3. Nasaď bezpečnostné pravidlá

Buď cez Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

alebo skopíruj obsah `firestore.rules` priamo do Firebase Console →
Firestore Database → Rules → Publish.

### 4. GitHub Pages

Repozitár → Settings → Pages → Source: `main` branch, `/ (root)`.
Stránka pobeží na `https://<username>.github.io/<repo>/`.

## Prvé prihlásenie a trezor

1. Otvor stránku, prihlás sa e-mailom a heslom z Firebase Authentication.
2. Vytvor prvý projekt (záložka "Trezor" je zamknutá, kým nezadáš heslá).
3. Pri prvom zadaní hesla do admin zóny ťa appka vyzve na **vault passphrase** —
   tá sa použije navždy pre všetky budúce šifrované záznamy. Zapamätaj si ju
   bezpečne, nikde sa neukladá.

## Funkcie

- Karty projektov: názov, klient, kontakt, web, GitHub, admin URL, tech tagy
- Stavy: Dopyt / V realizácii / Dokončené / Údržba / Pozastavené
- Cena a stav platby (zaplatené / čaká sa / na splátky)
- Termíny: začiatok, deadline, expirácia domény/hostingu
- Dashboard s metrikami a "Projektovým pulzom" — prehľad blížiacich sa termínov
- Filtrovanie podľa stavu a fulltextové vyhľadávanie
- Checklist úloh per projekt
- Časovaný log poznámok / dohôd s klientom
- Ďalšie dôležité linky (zmluvy, Drive priečinky…)
- Šifrovaný trezor na admin prihlasovacie údaje
- Export celej databázy do JSON (citlivé polia ostávajú zašifrované)
- Svetlý / tmavý režim

## Odporúčania do budúcna

- Zapni 2FA na Google konte spojenom s Firebase.
- Pravidelne sťahuj export ako šifrovanú zálohu.
- Neukladaj sem bankové údaje ani superadmin prístupy bez ďalšieho zváženia.
- Pri strate vault passphrase sa šifrované údaje nedajú obnoviť — over si,
  že ju máš bezpečne zálohovanú (napr. v password manažéri).
