# Client Project CRM

Samostatne CRM pre evidenciu klientskych webov, projektov, GitHub repozitarov, kontaktov a citlivych pristupov. Projekt je navrhnuty tak, aby:

- kod zil v samostatnej GitHub repository,
- data boli vo Firebase Firestore,
- vstup do systemu chrani Firebase Authentication,
- prihlasenia a hesla ku klientskym administraciam boli navyse sifrovane v prehliadaci cez vlastny vault kluc.

## Co uz tato verzia obsahuje

- prihlasovanie cez Firebase Email/Password
- dashboard s metrikami
- filtrovanie podla textu, stavu a priority
- CRUD spravu klientskych projektov
- polia pre nazov projektu, lokalitu, GitHub repo, klienta, kontakt, admin URL, dolezite datumy, poznamky a dalsie linky
- sifrovany vault pre citlive prihlasovacie udaje
- export databazy projektov do JSON
- ukazkovy dashboard bez potreby Firebase konfiguracie

## Odporucana architektura

- GitHub repository: verzovanie kodu, issue tracking, buduci CI/CD
- GitHub Pages alebo Firebase Hosting: nasadenie frontendu
- Firebase Authentication: vstup do CRM
- Cloud Firestore: projekty, klienti, poznamky, linky, datumy
- Volitelne neskor:
  - Firebase Storage pre briefy, loga, exporty a zmluvy
  - Cloud Functions pre notifikacie na expiracie alebo follow-upy

## Bezpecnostny model

Firebase login chrani samotny pristup do aplikacie. To je prva vrstva.

Citlive polia ako admin login a heslo sa nesnazia ukladat v cistej forme. Pred zapisom sa sifruju v prehliadaci cez Web Crypto API a do Firestore sa uklada iba sifrovany bundle. To je druha vrstva.

Do praxe by som ti odporucil:

- pouzit silny Firebase ucet s 2FA na Google konte
- pouzit dlhy a unikarny vault kluc
- neukladat sem pristupy ku banke, fakturacii alebo superadmin pristupy bez dalsieho zvazenia
- pravidelne exportovat sifrovanu zalohu

## Rychly start

1. Vytvor novu GitHub repository, napr. `client-project-crm`.
2. Skopiruj obsah tohto priecinka do novej repo.
3. Vo Firebase Console vytvor novy projekt.
4. Zapni:
   - Authentication -> Sign-in method -> Email/Password
   - Firestore Database
5. Vypln realne Firebase hodnoty v `assets/firebase-config.js`.
6. Do Firestore nahraj pravidla zo suboru `firestore.rules`.
7. Vo Firebase Authentication vytvor prveho pouzivatela manualne.
8. Ak pojdes cez GitHub Pages, pridaj svoju domenu do Firebase Authentication -> Settings -> Authorized domains.

## GitHub Pages nasadenie

Najjednoduchsia cesta:

1. Pushni repo na GitHub.
2. V nastaveniach repository otvor `Settings -> Pages`.
3. Ako source nastav branch, kde mas tento projekt, typicky `main` a root `/`.
4. Po deployi skontroluj, ci je GitHub Pages domena pridana medzi autorizovanymi domenami vo Firebase.

Tento repozitar moze obsahovat aj GitHub Actions workflow pre automaticky deploy statickej verzie na GitHub Pages.
Aj bez Firebase konfiguracie sa ti stranka vzdialene nacita a bude fungovat ukazkovy dashboard rezim.

Poznamka: `assets/firebase-config.js` je pri tomto type frontendu bezne verejny. Samotna Firebase web konfiguracia nie je tajomstvo. Bezpecnost stoji na Firebase Authentication, Firestore pravidlach a na tom, ze citlive klientove hesla sa ukladaju sifrovane vlastnym vault klucom.

## Firebase Hosting nasadenie

Ak nechces riesit konfiguracny subor cez GitHub Pages, Firebase Hosting je pri tomto type projektu casto cistejsie riesenie.

1. Nainstaluj Firebase CLI.
2. Prihlas sa: `firebase login`
3. Inicializuj hosting v tomto priecinku.
4. Deploy: `firebase deploy`

Subor `firebase.json` je pripraveny ako jednoducha startovacia konfiguracia.

## Firestore model

Kolekcia: `projects`

Priklad dokumentu:

```json
{
  "ownerId": "uid",
  "ownerEmail": "ty@domena.sk",
  "name": "Web pre Studio Aurora",
  "serviceType": "WordPress support",
  "status": "live",
  "priority": "medium",
  "projectUrl": "https://studioaurora.sk",
  "adminUrl": "https://studioaurora.sk/wp-admin",
  "repoUrl": "https://github.com/meno/repo",
  "clientName": "Jana Novakova",
  "clientEmail": "jana@studioaurora.sk",
  "clientPhone": "+421...",
  "budget": "1400",
  "recurringFee": "150",
  "nextDeadline": "2026-07-10",
  "renewalDate": "2026-08-01",
  "importantLinks": "Analytics - https://...",
  "notes": "Caka sa na texty a fotky.",
  "credentialVault": {
    "algorithm": "AES-GCM",
    "version": 1,
    "salt": "...",
    "iv": "...",
    "cipher": "..."
  }
}
```

## Co by som doplnil v dalsom kroku

Ak z toho chces naozaj silny pracovny system, dalsia faza by mohla obsahovat:

- pipeline objednavky: dopyt, kalkulacia, schvalenie, realizacia, odovzdanie
- tasky ku projektu a checklists pred spustenim
- pripomienky na obnovu domen, SSL, faktur a support balikov
- evidenciu zmluv, briefov a assetov
- zaznam komunikacie s klientom
- rozdelenie na klienta, projekt a fakturaciu
- dashboard s mesacnym prijmom z retainerov

## Dolezita poznamka ku GitHub repo

V tomto prostredi nebol dostupny `git`, preto som pripravil kompletny projektovy priecinok, ale samotne `git init`, vytvorenie vzdialenej repository a push som tu nespravil. Kod je pripraveny tak, aby si z neho vedel spravit novu repo okamzite.
