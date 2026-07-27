# C Visual Static Analyzer

Desktop aplikacija za vizuelnu statičku analizu C koda i AI asistenciju pri učenju programiranja.

## Arhitektura

```
c-visual-static-analyzer/
├── electron/                  # Electron main proces
│   ├── main.ts               # IPC handleri, integracija sa alatom
│   ├── preload.ts            # Preload skript (contextBridge API)
│   └── settings.ts           # Čuvanje/učitavanje podešavanja
├── src/                       # Renderer proces (React)
│   ├── App.tsx               # Glavna komponenta, state menadžment
│   ├── components/           # UI komponente
│   │   ├── Editor.tsx        # Monaco editor
│   │   ├── AIPanel.tsx       # AI chat panel
│   │   ├── SettingsDialog.tsx # Podešavanja
│   │   ├── StaticAnalysisPanel.tsx # Cppcheck rezultati + metrike
│   │   ├── OutputPanel.tsx   # Terminal output
│   │   ├── StatusBar.tsx     # Status bar
│   │   └── Toolbar.tsx       # Toolbar
│   ├── analysis/
│   │   ├── markers.ts        # Generisanje markera za editor
│   │   └── parsers.ts        # Parsiranje GCC i Cppcheck izlaza
│   ├── lib/
│   │   └── utils.ts          # Helper funkcije
│   └── types/                # TypeScript tipovi
├── dist-electron/            # Build-ovani main + preload
└── dist/                     # Build-ovani renderer
```

## Funkcionalnosti

| Funkcionalnost | Opis |
|---------------|------|
| **Editor** | Monaco editor sa sintaksnim bojenjem, markerima za greške |
| **GCC compile & run** | Kompajliranje i pokretanje C koda, prikaz grešaka/upozorenja |
| **Cppcheck analiza** | Statička analiza koda sa vizuelnim označavanjem problema |
| **AI asistent** | Chat sa LLM modelom (Ollama) za objašnjavanje koda |
| **Metrike** | Linije koda, funkcije, petlje, pokazivači, komentari... |

## Tehnologije

- **Frontend:** React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Editor:** Monaco Editor
- **Desktop:** Electron 30
- **Build:** Vite + vite-plugin-electron
- **Testovi:** Vitest

## Instalacija

```bash
npm install
```

## Razvoj

```bash
npm run dev         # Pokreće Vite dev server + Electron
npm run build       # Build za produkciju
npm run test        # Pokreće testove
npm run test:watch  # Testovi u watch modu
npm run lint        # ESLint provera
```

## Podešavanje

Pre korišćenja AI asistenta, potrebno je pokrenuti Ollama servis:

```bash
ollama serve
```

Podržani modeli: `gemma4:e4b` (podrazumevani), `llama3.2`, `mistral`, itd.

API ključevi nisu potrebni — Ollama radi lokalno.

## Struktura podataka

### IPC komunikacija

Renderer ← IPC → Main proces:

| Kanal | Smer | Opis |
|-------|------|------|
| `file:open` | invoke | Otvaranje C fajla |
| `file:save` | invoke | Čuvanje fajla |
| `gcc:compile` | invoke | Kompajliranje koda |
| `gcc:check` | invoke | Detekcija GCC-a |
| `cppcheck:analyze` | invoke | Statička analiza |
| `cppcheck:check` | invoke | Detekcija Cppcheck-a |
| `llm:chat` | on | Slanje poruke AI-ju (streaming) |
| `llm:stop` | on | Prekidanje generisanja |
| `llm:check` | invoke | Provera dostupnosti Ollame |
| `llm:chunk` | on (→renderer) | Streaming chunk |
| `llm:done` | on (→renderer) | Kraj streama |
| `llm:error` | on (→renderer) | Greška |
| `program:run` | invoke | Pokretanje kompajliranog programa |
| `settings:get/save` | invoke | Podešavanja |
