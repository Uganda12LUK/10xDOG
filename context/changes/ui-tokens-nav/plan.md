# ui-tokens-nav Implementation Plan

## Overview

Zaktualizowanie globalnego systemu tokenów (promień, cień karty, font Inter) i zastąpienie desktopowego Topbara mobilną nawigacją dolną (BottomNav) z 5 tabami. To prerequisite dla wszystkich kolejnych zmian UI.

## Current State Analysis

- `src/styles/global.css`: `--radius: 0.75rem` (12px); brak `--shadow-card`; brak importu fontu; `body` nie ma `font-family`
- `src/layouts/Layout.astro`: renderuje Topbar na każdej stronie, bez paddingu na dolną nav
- `src/components/Topbar.astro`: pozioma nawigacja, widoczna na wszystkich rozdzielczościach
- Brak `src/components/BottomNav.astro`
- Ikony w codebase: `Welcome.astro` używa inline SVG — wzorzec do naśladowania

## Desired End State

Po zakończeniu zmiany:
- Wszystkie karty używają `rounded-xl` (~16px) i `shadow-card` (subtelny cień + border)
- Typografia to Inter zamiast systemowej
- Na mobile (< md) widoczny BottomNav z 5 tabami; Topbar ukryty
- Na desktop (≥ md) Topbar widoczny; BottomNav niewidoczny (fixed, poza viewport)
- Aktywny tab podświetlony kolorem `text-primary` (koral)

### Key Discoveries:

- `src/styles/global.css:121` — `@theme inline` to jedyne miejsce, gdzie tokeny CSS trafiają do Tailwind; `--shadow-card` musi być dodany tu
- `src/layouts/Layout.astro:37` — wrapper div `class="bg-background min-h-screen"` przyjmie `pb-[70px]`
- `src/components/Topbar.astro:16` — klasa `flex` musi zmienić się na `hidden md:flex`
- `src/components/Welcome.astro` — inline SVG wzorzec dla ikon w Astro componentach

## What We're NOT Doing

- Instalacja żadnych nowych npm packages (Leaflet, shadcn components — to kolejne slice'y)
- Zmiana kolorów tokenów (koral, tło, border są już prawidłowe)
- Budowanie żadnych ekranów (dashboard, owners, meetings — osobne zmiany)
- Dark mode toggle UI (tokeny dark mode już istnieją, BottomNav je obsługuje przez CSS)

## Implementation Approach

Faza 1 jest czysto addytywna w CSS (żaden istniejący komponent nie straci klas). Faza 2 dodaje BottomNav jako nowy komponent i minimalnie modyfikuje Layout i Topbar — żadnych istniejących API nie zmienia.

## Phase 1: Tokeny i font

### Overview

Trzy zmiany w `global.css` i dwie linijki w `Layout.astro <head>`. Żadnych nowych dependencies.

### Changes Required:

#### 1. src/styles/global.css — promień

**File**: `src/styles/global.css`

**Intent**: Zmień `--radius` z `0.75rem` na `1rem` (16px). Derived values w `@theme inline` (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`) zaktualizują się automatycznie przez `calc()`.

**Contract**: Linia 18: `--radius: 1rem;`

#### 2. src/styles/global.css — shadow-card i card-interactive

**File**: `src/styles/global.css`

**Intent**: Dodaj token `--shadow-card` do `:root` i `.dark`, opublikuj w `@theme inline`, i dodaj utility klasę `card-interactive` dla efektu wciśnięcia na elementach interaktywnych.

**Contract**:
- W `:root` (po `--ring`): `--shadow-card: 0 1px 4px 0 rgb(0 0 0 / 0.07), 0 0 0 1px var(--border);`
- W `.dark` (po `--ring`): `--shadow-card: 0 1px 6px 0 rgb(0 0 0 / 0.25), 0 0 0 1px var(--border);`
- W `@theme inline` (po `--color-ring`): `--shadow-card: var(--shadow-card);`
- W `@layer base` body: brak zmian tu — font-family trafia do body
- Nowy blok `@layer utilities` na końcu pliku:
  ```css
  @layer utilities {
    .card-interactive {
      @apply active:scale-[0.98] transition-transform duration-75;
    }
  }
  ```

#### 3. src/styles/global.css — font Inter

**File**: `src/styles/global.css`

**Intent**: Ustaw Inter jako font body. Import przez Google Fonts trafia do `<head>` (Layout.astro), tu dodajemy tylko `font-family` do `@layer base body`.

**Contract**: W `@layer base` w selektorze `body { @apply bg-background text-foreground; }` dopisz `font-family: 'Inter', system-ui, sans-serif;` — jako osobna właściwość CSS (nie @apply, bo to nie klasa Tailwind).

#### 4. src/layouts/Layout.astro — Google Fonts w head

**File**: `src/layouts/Layout.astro`

**Intent**: Załaduj Inter z Google Fonts. `preconnect` skraca czas DNS lookup. `display=swap` zapobiega FOIT.

**Contract**: Przed `<title>` w `<head>` dodaj:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&display=swap" rel="stylesheet" />
```

### Success Criteria:

#### Automated Verification:

- `npm run lint` — 0 błędów/ostrzeżeń

#### Manual Verification:

- DevTools Elements → `:root` ma `--shadow-card` i `--radius: 1rem`
- DevTools Computed → `body` font-family zaczyna się od `Inter`
- Wizualnie: istniejące karty (np. `/auth/signin`) mają większe zaokrąglenie niż poprzednio

---

## Phase 2: BottomNav

### Overview

Nowy komponent `BottomNav.astro`, minimalne zmiany w `Layout.astro` (import + pb + warunek) i `Topbar.astro` (hidden mobile).

### Changes Required:

#### 1. src/components/BottomNav.astro — nowy komponent

**File**: `src/components/BottomNav.astro` (nowy)

**Intent**: Mobilna nawigacja dolna z 5 tabami. Stała pozycja na dole ekranu, widoczna tylko na mobile (Tailwind: `flex md:hidden`). Aktywny tab wykrywany przez `currentPath.startsWith(href)` z wyjątkiem `/dashboard` który używa dokładnego dopasowania (start `/`-route nie ma subrout).

**Contract**:
```
Props: { currentPath: string }

Taby (href, etykieta):
  /dashboard  → "Start"     (ikona: Home/House)
  /owners     → "Mapa"      (ikona: Map)
  /meetings   → "Spotkania" (ikona: Calendar)
  /events     → "Wydarzenia"(ikona: Star/Ticket)
  /profile    → "Profil"    (ikona: User)

Aktywność:
  /dashboard: currentPath === '/dashboard'
  pozostałe:  currentPath.startsWith(href)

Layout:
  - fixed bottom-0 left-0 right-0 z-50
  - h-[70px] bg-card border-t border-border
  - flex justify-around items-center
  - safe-area: pb-safe (lub pb-[env(safe-area-inset-bottom)])

Każdy tab:
  - <a href="..."> flex flex-col items-center gap-0.5 px-2 py-1
  - Ikona 24x24 inline SVG (stroke="currentColor" strokeWidth="1.5" fill="none")
  - Etykieta <span class="text-[10px] font-medium leading-none">
  - Aktywny: text-primary; nieaktywny: text-muted-foreground
  - Transition: transition-colors duration-150
  - card-interactive na całym linku
```

Ikony jako inline SVG (stroke-based, 24x24 viewBox). Wzorzec z `Welcome.astro`.

#### 2. src/layouts/Layout.astro — BottomNav integration

**File**: `src/layouts/Layout.astro`

**Intent**: Zaimportuj BottomNav, renderuj go tylko dla zalogowanych użytkowników i dodaj padding-bottom do wrappera, żeby ostatnie treści nie chowały się pod navem.

**Contract**:
- Import na górze frontmatter: `import BottomNav from "@/components/BottomNav.astro";`
- Pobierz `user` z `Astro.locals` w frontmatter
- Wrapper div: dodaj `class:list` z warunkiem: `pb-[70px]` gdy `!!user`
- Tuż przed zamknięciem `</body>` dodaj: `{user && <BottomNav currentPath={Astro.url.pathname} />}`

#### 3. src/components/Topbar.astro — hidden on mobile

**File**: `src/components/Topbar.astro`

**Intent**: Topbar pozostaje dla desktopa; na mobile go chowamy.

**Contract**: Na outermost `<div>` zmień klasę `flex` na `hidden md:flex`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` — 0 błędów
- `npm run build` — kompiluje bez błędów TypeScript/Astro

#### Manual Verification:

- @ 390px DevTools: BottomNav widoczny, Topbar niewidoczny; aktywny tab (np. `/meetings`) ma kolor koralowy
- @ 1024px DevTools: Topbar widoczny, BottomNav niewidoczny
- Niezalogowany (`/auth/signin`): BottomNav niewidoczny
- `/owners/some-id`: tab "Mapa" aktywny (startsWith)
- `/dashboard`: tab "Start" aktywny (exact match)
- Safe area iPhone: BottomNav nie nachodzi na pasek gestów (env safe-area)

---

## Testing Strategy

### Manual Testing Steps:

1. `npm run dev` → otwórz w Chrome DevTools 390px (iPhone)
2. Zaloguj się → sprawdź BottomNav
3. Nawiguj przez każdy tab → sprawdź highlight
4. Wejdź na `/owners/123` → tab "Mapa" aktywny?
5. Resize do 1024px → Topbar wraca, BottomNav znika
6. Wyloguj się → BottomNav znika

## References

- Design spec: plan sesji planowania (roadmap UI Mobile Redesign)
- Wzorzec inline SVG: `src/components/Welcome.astro`
- Token source: `src/styles/global.css`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Tokeny i font

#### Automated

- [x] 1.1 npm run lint — 0 błędów — 750f639

#### Manual

- [x] 1.2 DevTools :root ma --shadow-card i --radius: 1rem — 750f639
- [x] 1.3 DevTools body font-family zaczyna się od Inter — 750f639
- [x] 1.4 Istniejące karty mają większe zaokrąglenie — 750f639

### Phase 2: BottomNav

#### Automated

- [x] 2.1 npm run lint — 0 błędów
- [x] 2.2 npm run build — brak błędów TypeScript/Astro

#### Manual

- [ ] 2.3 @ 390px: BottomNav widoczny, aktywny tab w koralu
- [ ] 2.4 @ 1024px: Topbar widoczny, BottomNav niewidoczny
- [ ] 2.5 Niezalogowany: BottomNav niewidoczny
- [ ] 2.6 /owners/some-id: tab Mapa aktywny
- [ ] 2.7 Safe area iPhone: brak nachodzenia
