# ScripticX — Documentația Proiectului

*Platformă educațională pentru învățarea programării prin limbajul MiniScript+ (MSP)*

---

## 1. Informații generice despre proiect

**Nume:** ScripticX
**Categorie:** Software Educațional
**Domenii web:**
- `scripticx.org` — pagina de prezentare (landing)
- `platform.scripticx.org` — platforma interactivă

### Descriere

ScripticX este o platformă educațională web pentru elevi și începători care vor să înțeleagă programarea pas cu pas, fără să se lovească de bariere tehnice inutile. În centrul platformei se află **MiniScript+ (MSP)** — un limbaj de programare original, gândit de la zero pentru educație: sintaxă minimă, mesaje de eroare clare în limba utilizatorului și o curbă de învățare blândă.

### Public-țintă

- Elevi de gimnaziu și liceu fără experiență anterioară în programare
- Profesori care doresc materiale și exerciții gata pregătite pentru orele de informatică
- Autodidacți care vor o introducere prietenoasă în logica programării

### Obiective educaționale

1. Reducerea barierei de intrare în programare prin eliminarea complexității sintactice inutile
2. Învățare activă prin rezolvare de probleme, livecoding și feedback imediat
3. Comunitate: utilizatorii pot urmări alți elevi, publica postări, partaja fragmente de cod și concura într-un clasament
4. Suport bilingv (română / engleză) pentru a deservi atât utilizatorii locali, cât și pe cei internaționali

### Funcționalități principale

| Modul | Descriere |
|-------|-----------|
| **Editor MSP** | Editor de cod bazat pe Monaco cu evidențierea sintaxei MiniScript+ și rulare în browser |
| **Clase / Lecții** | Profesorii organizează elevii în clase și le distribuie lecții structurate |
| **Probleme** | Set de probleme cu enunț, exemple, soluții verificate automat |
| **Snippets** | Fragmente de cod publice partajate între utilizatori |
| **Feed / Postări** | Comunitate cu postări și comentarii |
| **Livecode** | Sesiuni de codare în timp real |
| **Leaderboard** | Clasament pe baza problemelor rezolvate și a contribuției |
| **Profiluri** | Pagini personale cu statistici, urmăritori și realizări |
| **Panou admin** | Gestionare utilizatori, conținut, banuri |

---

## 2. Ghid de instalare și utilizare

### 2.1 Utilizare ca aplicație web (recomandat)

Aplicația este disponibilă online și nu necesită instalare:

1. Se accesează `https://platform.scripticx.org`
2. Se creează un cont (email + parolă) sau se folosește autentificarea existentă
3. Se navighează la secțiunea dorită din meniul lateral: *Învață*, *Probleme*, *Editor*, *Feed* etc.
4. Pentru a scrie cod MSP: se accesează *Editor*, se introduce codul și se apasă *Run*

### 2.2 Rulare locală (pentru dezvoltatori / juriu)

**Cerințe preliminare:**
- Node.js ≥ 20
- npm ≥ 10
- Un cont Supabase (sau credențiale furnizate)

**Pași:**

```bash
# 1. Clonare repository
git clone https://github.com/scripticx/scripticx.git
cd scripticx

# 2. Instalare dependențe
npm install

# 3. Configurare variabile de mediu
# Se creează un fișier .env.local cu:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 4. Pornire server de dezvoltare
npm run dev
```

Aplicația va fi disponibilă la `http://localhost:3000`.

**Build pentru producție:**

```bash
npm run build
npm run start
```

### 2.3 Fluxul tipic al unui elev

1. **Înregistrare** → cont nou pe platformă
2. **Învățare** → parcurge lecțiile din secțiunea *Învață*
3. **Practică** → rezolvă probleme din secțiunea *Probleme*
4. **Experimentare** → scrie cod liber în *Editor*
5. **Comunitate** → urmărește alți utilizatori, publică postări, partajează snippets
6. **Progres** → vede clasamentul și realizările pe pagina de profil

### 2.4 Fluxul unui profesor

1. Crează o **clasă** din panoul de control
2. Adaugă elevi (prin invitație)
3. Atribuie **lecții** și **probleme**
4. Monitorizează progresul elevilor

---

## 3. Arhitectura aplicației

### 3.1 Viziune generală

ScripticX este o aplicație web modernă de tip **full-stack**, construită ca o aplicație Next.js cu randare hibridă (Server Components + Client Components). Datele și autentificarea sunt gestionate printr-un backend **Supabase** (PostgreSQL + Auth + Storage).

```
┌──────────────────────────────────────────────────────┐
│                    Utilizator                        │
│        (browser desktop / mobil — orice OS)          │
└────────────────────┬─────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼─────────────────────────────────┐
│                Next.js (App Router)                  │
│  ┌───────────────────┐  ┌─────────────────────────┐  │
│  │  Server Components│  │   Client Components     │  │
│  │  (SSR, fetch DB)  │  │  (editor, interactivit.)│  │
│  └───────────────────┘  └─────────────────────────┘  │
│           React Query (cache) · i18n · Tailwind      │
└────────────────────┬─────────────────────────────────┘
                     │ SDK Supabase
┌────────────────────▼─────────────────────────────────┐
│                     Supabase                         │
│   PostgreSQL  ·  Auth  ·  Storage  ·  Row-Level      │
│                          Security                    │
└──────────────────────────────────────────────────────┘
```

### 3.2 Structura codului

```
scripticx/
├── app/                    # Rutele aplicației (Next.js App Router)
│   ├── editor/             # Editorul de cod MSP
│   ├── classes/            # Clase și lecții
│   ├── problems/           # Probleme de rezolvat
│   ├── feed/               # Feed comunitar
│   ├── livecode/           # Sesiuni de codare live
│   ├── leaderboard/        # Clasament
│   ├── profile/, u/        # Profilul propriu / al altora
│   ├── admin/              # Panoul de administrare
│   ├── login/, settings/   # Autentificare și setări
│   └── layout.tsx          # Layout-ul global
├── components/             # Componente UI reutilizabile
│   ├── ui/                 # Primitive (buton, dialog, input…)
│   ├── layout/             # Sidebar, navbar, drawer mobil
│   └── LanguageProvider.tsx
├── lib/                    # Logica de bază
│   ├── engine.ts           # Interpretorul MiniScript+ (MSP)
│   ├── msp-parser.ts       # Parser AST avansat pentru MSP
│   ├── msp-visualizer.ts   # Generare diagrame AST și flowchart
│   ├── complexity-analyzer.ts  # Analiză complexitate timp/spațiu
│   ├── i18n.ts             # Sistem de traduceri RO/EN
│   ├── getLocalized.ts     # Citire conținut multilingv din BD
│   ├── supabase.ts         # Client Supabase (browser)
│   ├── supabaseServer.ts   # Client Supabase (server)
│   ├── achievements.ts     # Logică realizări
│   └── useUser.ts          # Hook pentru utilizatorul curent
├── hooks/                  # React hooks personalizate
├── public/                 # Resurse statice
└── MSP_code_ex/            # Exemple de cod MSP
```

### 3.3 Componente arhitecturale cheie

#### Motorul MiniScript+ (`lib/engine.ts`)

Inima proiectului — un **interpretor** scris în TypeScript, care execută cod MSP direct în browser, fără niciun server implicat. Include:

- **Lexer** — împarte codul sursă în tokeni
- **Parser** — construiește arborele sintactic (AST)
- **Evaluator** — execută AST-ul cu suport pentru variabile, condiții (`IF/ELSE`), bucle (`WHILE`), intrare/ieșire (`INPUT/PRINT`), operatori aritmetici (inclusiv `%`) și tipuri de date (numere, șiruri, boolean)
- **Mesaje de eroare** prietenoase, localizate

Codul utilizatorului rulează **exclusiv în browser** — nu ajunge niciodată pe vreun server, ceea ce garantează atât viteză, cât și confidențialitate.

#### Sistemul de traduceri (`lib/i18n.ts`)

Aplicația este complet bilingvă (română / engleză). Toate textele interfeței trec printr-un `LanguageProvider` React, iar conținutul (lecții, probleme) este stocat în coloane multilingve în baza de date și citit prin `getLocalized.ts`.

#### Caching cu React Query

Datele de la Supabase sunt aduse o singură dată și cache-uite client-side cu `@tanstack/react-query` — reduce latența, traficul și costurile.

#### Autentificare și securitate

- Autentificarea: Supabase Auth (email + parolă)
- Autorizare: **Row-Level Security** la nivel de bază de date — fiecare utilizator poate citi/modifica strict ce îi aparține
- `RouteGuard.tsx` — protejează rutele care necesită autentificare

### 3.4 Portabilitate

Fiind o aplicație **web**, ScripticX rulează pe orice dispozitiv cu un browser modern:

- Desktop (Windows, macOS, Linux)
- Tabletă (iPadOS, Android)
- Telefon mobil (interfață optimizată cu `MobileDrawer` și `MobileNav`)

Designul este **responsive**, construit cu Tailwind CSS și o navigație dedicată pentru ecrane mici.

---

## 4. Justificarea tehnologiilor alese

| Tehnologie | Versiune | De ce am ales-o |
|-----------|----------|-----------------|
| **Next.js** | 15 (App Router) | Framework full-stack standard în industrie. Permite Server Components pentru randare rapidă, rute API integrate, optimizări automate (fonturi, imagini, code-splitting). |
| **React** | 19 | Biblioteca UI dominantă, componente declarative, ecosistem vast. Versiunea 19 aduce performanță îmbunătățită și Server Actions. |
| **TypeScript** | 5 | Siguranță la tipuri — esențială pentru un proiect de această dimensiune, mai ales pentru interpretorul MSP unde un bug de tipuri ar însemna erori în execuția codului utilizatorilor. |
| **Supabase** | 2 | Backend „Postgres-as-a-Service" complet: bază de date relațională puternică, autentificare, storage, toate cu Row-Level Security. Permite dezvoltare rapidă fără a scrie un backend propriu, fără a sacrifica controlul (e SQL standard în spate). |
| **Tailwind CSS** | 4 | Stilizare prin utilitare — design system consecvent, build mic, refactor ușor. Versiunea 4 aduce un compilator mult mai rapid. |
| **Monaco Editor** | 4.7 | Același motor de editor folosit în VS Code — utilizatorii capătă o experiență profesională (autocomplete, syntax highlighting, multi-cursor) chiar și pe o platformă educațională. |
| **React Query** | 5 | Gestionarea stării server-side: cache inteligent, refetch automat, optimistic updates. Reduce dramatic codul boilerplate pentru fetch + loading + error. |
| **Radix UI / Base UI** | — | Primitive UI **accesibile** (a11y) — esențial pentru un produs educațional care trebuie să fie utilizabil de oricine, inclusiv cu tehnologii asistive. |
| **Lucide React** | — | Set de iconițe coerent, ușor, open-source. |
| **date-fns** | 4 | Manipulare de date modulară (tree-shakeable), spre deosebire de alternativele monolitice. |
| **Git + GitHub** | — | Versionarea codului, istoricul complet al deciziilor, colaborare. |

### De ce un limbaj propriu (MiniScript+)?

Limbajele existente (Python, JavaScript, Scratch) prezintă fiecare un compromis pentru un începător român:
- **Python** — sintaxă curată, dar mesaje de eroare în engleză, configurare locală complicată
- **JavaScript** — disponibil în browser, dar plin de „gotchas" (`==` vs `===`, `this`, hoisting)
- **Scratch** — accesibil, dar nu pregătește tranziția spre programare reală

**MiniScript+** este conceput special pentru context educațional: sintaxă minimă, mesaje de eroare clare și localizate, zero configurare, rulare instant în browser. Un elev poate scrie primul program în primele minute.

---

*Document pregătit pentru concursul **InfoEducație** — Secțiunea Software Educațional.*
