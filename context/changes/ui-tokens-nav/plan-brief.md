# ui-tokens-nav — Plan Brief

> Full plan: `context/changes/ui-tokens-nav/plan.md`

## What & Why

Zmieniamy globalny system tokenów (radius kart 12→16px, nowy shadow-card, font Inter) i zastępujemy desktopowy Topbar mobilną nawigacją dolną. To prerequisite dla wszystkich 7 kolejnych zmian UI — bez tego każdy następny slice byłby budowany na nieaktualnych tokenach.

## Starting Point

Aplikacja ma `--radius: 0.75rem`, brak tokenu `--shadow-card`, brak fontu (system-ui), i Topbar widoczny na wszystkich rozdzielczościach. Kolory koralowe i tło ciepłe są już prawidłowe.

## Desired End State

Na mobile (< md breakpoint) widoczny BottomNav z 5 tabami (Start, Mapa, Spotkania, Wydarzenia, Profil) — aktywny tab w koralu. Topbar ukryty na mobile, widoczny na desktop. Wszystkie karty w appce dostają `rounded-xl` (~16px) i subtelny cień z `shadow-card`. Typografia to Inter.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Font delivery | Google Fonts CDN | Zero plików w repo, łatwe; RODO akceptowalne dla MVP | Plan |
| Active tab detection | startsWith(href) | /owners/[id] poprawnie podświetla tab "Mapa" | Plan |
| BottomNav visibility | Tylko zalogowany | Auth pages i landing pozostają czyste | Plan |
| --radius | 1rem (16px) | Odpowiada spec "16-18px zaokrąglenie" | Plan |

## Scope

**In scope:**
- `global.css`: --radius, --shadow-card, @layer utilities .card-interactive, font-family Inter
- `Layout.astro`: Google Fonts w head, import BottomNav, pb-[70px] gdy user
- `Topbar.astro`: hidden md:flex
- Nowy `BottomNav.astro`: 5 tabów, inline SVG ikony, fixed bottom, 70px

**Out of scope:**
- Instalacja nowych npm packages (Leaflet, shadcn tabs/sheet — kolejne slice'y)
- Budowanie jakichkolwiek ekranów aplikacji
- Zmiana palety kolorów (tokeny koloru są już prawidłowe)
- Dark mode toggle UI

## Architecture / Approach

Faza 1 jest addytywna w CSS — żaden istniejący komponent nie traci klas. Faza 2 dodaje nowy komponent Astro i robi trzy minimalne zmiany (import, pb-class, `hidden md:flex`). BottomNav jest wyłącznie Astro (brak React/client:load) — ikony jako inline SVG, aktywność obliczana w frontmatter.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Tokeny i font | global.css + head links | Google Fonts blokuje w sieci offline — niska szansa |
| 2. BottomNav | Nowy komponent + Layout/Topbar wiring | Safe area inset na iPhone wymaga pb-safe |

**Prerequisites:** Brak — to pierwsza zmiana UI.
**Estimated effort:** ~1 sesja (mały zakres, oba pliki dobrze znane).

## Open Risks & Assumptions

- Google Fonts CDN: w środowisku offline (wrangler dev bez netu) font nie załaduje się — fallback na system-ui działa poprawnie
- Safe area: `env(safe-area-inset-bottom)` wymaga `<meta name="viewport" content="...viewport-fit=cover">` — sprawdzić w Layout.astro

## Success Criteria (Summary)

- Na telefonie 390px zalogowany użytkownik widzi BottomNav, klik w tab zmienia aktywny stan na koralowy
- DevTools potwierdza Inter w font stack i --radius: 1rem w :root
- `npm run lint && npm run build` przechodzą bez błędów
