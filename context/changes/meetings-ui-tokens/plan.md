# Meetings UI Tokens — Implementation Plan

## Overview

Zastąpić wszystkie hardkodowane klasy kolorów Tailwind (`bg-purple-*`, `text-blue-*`, `text-white`) w widoku `/meetings` klasami semantycznymi z istniejącego systemu tokenów (`bg-primary`, `text-muted-foreground`, `border-border` itp.). Przed migracją widoku skalibrować wartości `--primary` w `src/styles/global.css`, bo domyślna paleta shadcn to szarość, nie fiolet PawMeet. Przy okazji naprawić N+1 zapytań w tym samym pliku.

## Current State Analysis

- `src/styles/global.css` zawiera pełny system tokenów Tailwind 4 (`@theme inline`) — klasy semantyczne są dostępne, ale nieużywane.
- `--primary` w `:root` = `oklch(0.205 0 0)` (ciemna szarość), w `.dark` = `oklch(0.922 0 0)` (jasna szarość) — nigdy nie skalibrowane na fiolet PawMeet.
- `src/pages/meetings/index.astro` — 74 linie, 10 ładunków (charges) zidentyfikowanych w research, wszystkie hardkodowane kolory.
- Efekt szklanej karty (`bg-white/10 backdrop-blur-xl`) nie ma odpowiednika w tokenach (token `bg-card` to kolor solidny) — pozostaje bez zmian.
- `listProfilesByIds` istnieje już w `src/lib/services/profile.ts:154` (dodane przy F3 fix w `walk-invitation-loop`). Widok `/meetings` nadal używa starego wzorca N+1.
- Klasa `.dark` nigdy nie jest aplikowana w `Layout.astro` — efektywnie używane są tylko wartości z `:root`.

## Desired End State

- `--primary` w `:root` i `.dark` odpowiada fioletowi PawMeet (≈ `purple-600`). Klasa `bg-primary` renderuje się jako fiolet w całej aplikacji.
- `/meetings/index.astro` nie zawiera żadnych hardkodowanych klas `purple-*`, `blue-*`, ani `text-white` — wszystkie zastąpione klasami semantycznymi.
- Profil counterparty pobierany jednym zapytaniem (`.in("id", ids)`) zamiast N równoległych.

### Key Discoveries

- `border-white/10` → `border-border`: idealne mapowanie — `--border` w `.dark` = `oklch(1 0 0 / 10%)` = dokładnie `white/10%`. Zmiana bezwzrokowa (`src/styles/global.css:57`)
- `bg-white/10 backdrop-blur-xl` — efekt glassmorphism; token `--card` nie wyraża tego efektu — intentionally preserved.
- `text-primary` po kalibracji = `oklch(0.558 0.288 301)` ≈ purple-600 (nieco ciemniejsze niż obecne `text-purple-300`); to akceptowalny kompromis jednego tokenu.
- Klasa `.dark` w Layout nigdy nie jest ustawiana — `:root` wartości są jedynymi aktywnymi. Obie wartości (`:root` i `.dark`) aktualizowane dla poprawności.
- `listProfilesByIds` w `src/lib/services/profile.ts:154` — gotowa do użycia, import jest już w `/invitations/index.astro:5`.

## What We're NOT Doing

- Migracja tokenów w innych widokach (`/invitations`, `/owners`, `/dogs`, `Topbar`, formularze) — osobne change.
- Instalacja `shadcn card` lub `shadcn badge` — user scope: "nic nie dodawać".
- Aktywacja trybu `.dark` poprzez dodanie `class="dark"` do `<html>` — osobna decyzja (wpływ globalny).
- Aktualizacja pozostałych tokenów kolorów (`: root --foreground`, `--card-foreground`) — poza zakresem tego change.
- Migracja `bg-white/10 backdrop-blur-xl` — brak tokenu dla efektu glass.
- Usunięcie hardkodowanych kolorów z `LibBadge.astro`.

## Implementation Approach

Dwie fazy sekwencyjne: najpierw dane (token values), potem UI (class names). Zmiana token values jest globalna i odwracalna; zmiana class names w widoku jest lokalna. Weryfikacja po każdej fazie przez `npm run lint` + `npm run build`.

## Critical Implementation Details

`text-primary` po kalibracji renderuje się jako `oklch(0.558 0.288 301)` (≈ purple-600). Na ciemnym tle kosmicznym jest to czytelny fiolet, ale nieco ciemniejszy od obecnego `text-purple-300` (≈ purple-300, lightness 0.792). Ta różnica jest zamierzona — jeden token, jedna wartość. Jeśli kontrast okaże się niewystarczający, dostosować `--primary` do `oklch(0.714 0.203 301)` (purple-400) bez zmiany class names.

---

## Phase 1: Kalibracja wartości --primary w global.css

### Overview

Zaktualizować wartości `--primary` i `--primary-foreground` w `src/styles/global.css` tak, żeby klasa `bg-primary` renderowała fiolet PawMeet zamiast domyślnej szarości shadcn.

### Changes Required

#### 1. Aktualizacja --primary w :root i .dark

**File**: `src/styles/global.css`

**Intent**: Zmienić wartości `--primary` z grayscale (domyślny shadcn) na fiolet PawMeet odpowiadający `bg-purple-600`. Zaktualizować też `.dark --primary-foreground` na białą dla spójności. Nie dotykać żadnych innych tokenów.

**Contract**: Zmienić cztery linie w istniejących blokach `:root` i `.dark`:

```css
/* :root */
--primary: oklch(0.558 0.288 301);          /* było: oklch(0.205 0 0) */
--primary-foreground: oklch(0.985 0 0);     /* bez zmian — near-white */

/* .dark */
--primary: oklch(0.558 0.288 301);          /* było: oklch(0.922 0 0) */
--primary-foreground: oklch(1 0 0);          /* było: oklch(0.205 0 0) */
```

Żadne inne tokeny nie są zmieniane.

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification

- Istniejący komponent `Button` w `/owners/[id]` renderuje przycisk fioletowy (bg-primary = purple-600) — widoczna zmiana z poprzedniego szarego/czarnego
- `npm run dev` odpala bez błędów

**Implementation Note**: Zatrzymaj się po tej fazie i zweryfikuj manualnie, że przyciski wyglądają poprawnie, zanim przejdziesz do Fazy 2.

---

## Phase 2: Migracja widoku /meetings + N+1 fix

### Overview

Zastąpić wszystkie hardkodowane klasy kolorów w `src/pages/meetings/index.astro` klasami semantycznymi. Naprawić N+1 zapytań przy okazji.

### Changes Required

#### 1. Fix N+1 — import listProfilesByIds

**File**: `src/pages/meetings/index.astro`

**Intent**: Zastąpić `import { getProfile }` przez `import { listProfilesByIds }` i przepisać blok profilowania counterparty na jeden batch query — identyczny pattern jak w `src/pages/invitations/index.astro:5,26-27`.

**Contract**: W frontmatter — usunąć `getProfile` z importu `@/lib/services/profile`, dodać `listProfilesByIds`. Zastąpić blok:
```ts
await Promise.all(Array.from(counterpartyIds).map(async (id) => {
  const profile = await getProfile(supabase, id);
  profileMap.set(id, profile);
}));
```
wywołaniem:
```ts
const fetched = await listProfilesByIds(supabase, Array.from(counterpartyIds));
for (const [id, profile] of fetched) profileMap.set(id, profile);
```

#### 2. Nagłówek — usuń gradient, użyj text-primary

**File**: `src/pages/meetings/index.astro:39`

**Intent**: Uprościć gradient heading do tokenu semantycznego — zamiast hardkodowanego `from-blue-200 to-purple-200` użyć `text-primary`.

**Contract**: Zastąpić pełny łańcuch klas `bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-2xl font-bold text-transparent` przez `text-2xl font-bold text-primary`.

#### 3. Border kart — border-border (2 miejsca)

**File**: `src/pages/meetings/index.astro:45` i `:60`

**Intent**: `border-white/10` → `border-border`. Semantycznie identyczne — token `.dark --border = oklch(1 0 0 / 10%) = white/10%`.

**Contract**: W obu elementach (`div` empty state i `li` karty) zamienić `border border-white/10` na `border border-border`.

#### 4. Link browsing — text-primary

**File**: `src/pages/meetings/index.astro:47`

**Intent**: Link "Browse owners →" używa hardkodowanego `text-purple-300` — zastąpić tokenem.

**Contract**: `text-purple-300 hover:underline` → `text-primary hover:underline`.

#### 5. Imię counterparty — text-card-foreground

**File**: `src/pages/meetings/index.astro:62`

**Intent**: `text-white` jako kolor imienia jest hardkodowany — zastąpić tokenem pasującym do kontekstu karty.

**Contract**: `text-white` → `text-primary` (fioletowy jako "primary content" na ciemnej karcie jest poprawniejszy semantycznie niż `text-white`).

#### 6. Badge typu spotkania — primary tokens

**File**: `src/pages/meetings/index.astro:63`

**Intent**: Badge "Walk"/"Breeding" używa hardkodowanych `bg-purple-600/60 text-purple-100` — po kalibracji --primary można użyć tokenu.

**Contract**: `bg-purple-600/60 text-purple-100` → `bg-primary/60 text-primary-foreground`.

#### 7. Data spotkania — text-muted-foreground

**File**: `src/pages/meetings/index.astro:65`

**Intent**: Tekst pomocniczy (data) używa `text-blue-100/60` — zastąpić tokenem muted.

**Contract**: `text-blue-100/60` → `text-muted-foreground`.

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification

- `/meetings` renderuje się poprawnie: karty widoczne, badge fioletowy, linki fioletowe, daty w muted-foreground
- N+1 naprawiony: dla 2 spotkań Supabase Network tab pokazuje 1 zapytanie profilowe zamiast 2
- Empty state wyświetla się poprawnie z linkiem "Browse owners →"
- Wygląd wizualnie spójny z poprzednim (fiolet dominuje, glassmorphism kart zachowany)

---

## Testing Strategy

### Manual Testing Steps

1. `npm run dev` — uruchom lokalnie
2. Zaloguj się jako `majerskiluk@gmail.com`
3. Otwórz `/meetings` — sprawdź, że lista spotkań się wyświetla (dane testowe z seeda)
4. Porównaj wygląd z poprzednim: karty szklane, badge fioletowy, link "Browse owners →" fioletowy
5. Otwórz Network tab (Supabase requests) — dla listy 2 spotkań powinny być max 2 zapytania (1 × meetings, 1 × profiles batch)
6. Wejdź na `/meetings` niezalogowany — powinien przekierować do `/auth/signin`

## References

- Research: `context/changes/meetings-ui-tokens/research.md`
- Token source: `src/styles/global.css` (inspected)
- Target view: `src/pages/meetings/index.astro` (inspected full)
- Pattern reference dla N+1: `src/pages/invitations/index.astro:5,26-27`
- listProfilesByIds: `src/lib/services/profile.ts:154`
- Ładunki C1–C10: `context/changes/meetings-ui-tokens/research.md#charge-list`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Kalibracja wartości --primary w global.css

#### Automated

- [x] 1.1 npm run lint passes
- [x] 1.2 npm run build passes

#### Manual

- [x] 1.3 Button w /owners/[id] renderuje się fioletowo (bg-primary = purple-600)
- [x] 1.4 npm run dev uruchamia się bez błędów

### Phase 2: Migracja widoku /meetings + N+1 fix

#### Automated

- [ ] 2.1 npm run lint passes
- [ ] 2.2 npm run build passes

#### Manual

- [ ] 2.3 /meetings renderuje się poprawnie: karty widoczne, badge fioletowy, linki fioletowe
- [ ] 2.4 N+1 fix: 1 zapytanie profilowe zamiast N (widoczne w Network tab)
- [ ] 2.5 Empty state widoczny i poprawny
- [ ] 2.6 Wizualnie spójne z poprzednim wyglądem
