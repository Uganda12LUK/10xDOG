# Research: ui-dogs

## Widok
`src/pages/dogs/index.astro`

## Źródło tokenów
`src/styles/global.css` — `:root`/`.dark` CSS vars + `@theme inline`

## Komponenty współdzielone w repo
- `src/components/ui/button.tsx`
- `src/components/ui/LibBadge.astro`

## Charge List

### C1 — Missing shared component: Karty psów zbudowane z surowego HTML
- **Plik:linia**: `src/pages/dogs/index.astro:54-76`
- **Klasy/kod**: `<li class="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">`
- **Efekt na użytkownika**: Każda zmiana stylu kart wymaga edycji bezpośrednio w widoku listy; pattern nie może być reużywany.
- **Fix**: Wyciągnąć do `src/components/DogCard.astro` z `bg-card border-border` zamiast hardkodowanych kolorów.

### C2 — Missing tokens: Przycisk "Add dog" z hardkodowanym kolorem
- **Plik:linia**: `src/pages/dogs/index.astro:29`
- **Klasy/kod**: `bg-purple-600 hover:bg-purple-500`
- **Efekt na użytkownika**: Przycisk używa hardkodowanego purple — nie odzwierciedla amber brand color z `--primary`.
- **Fix**: Użyć `<Button href="/dogs/new">Add dog</Button>` z button.tsx (używa `bg-primary`).

### C3 — Missing tokens: Hardkodowane kolory komunikatu błędu
- **Plik:linia**: `src/pages/dogs/index.astro:36`
- **Klasy/kod**: `border-red-500/30 bg-red-900/30 text-red-300`
- **Efekt na użytkownika**: Komunikat błędu nie używa `--destructive` tokenu — nie adaptuje się do zmian motywu.
- **Fix**: Zamienić na `border-destructive/30 bg-destructive/10 text-destructive`.

### C4 — Missing tokens: Hardkodowane kolory komunikatu sukcesu
- **Plik:linia**: `src/pages/dogs/index.astro:40`
- **Klasy/kod**: `border-green-500/30 bg-green-900/30 text-green-300`
- **Efekt na użytkownika**: Brak semantycznego tokenu sukcesu — hardkodowany zielony nie skaluje się z design systemem.
- **Fix**: Dodać `--success` token do global.css lub wyciągnąć komponent Alert z wariantem `success`.

### C5 — Missing tokens: Empty state z hardkodowanymi kolorami
- **Plik:linia**: `src/pages/dogs/index.astro:46`
- **Klasy/kod**: `border-white/10 bg-white/10 text-blue-100/80`
- **Efekt na użytkownika**: Empty state nie używa `bg-card`, `border-border` ani `text-muted-foreground` — wygląda niespójnie po zmianach tokenów.
- **Fix**: Zamienić na `border border-border bg-card p-8 text-center text-muted-foreground backdrop-blur-xl`.

### C6 — Missing tokens: Tło kart na liście psów
- **Plik:linia**: `src/pages/dogs/index.astro:57`
- **Klasy/kod**: `border-white/10 bg-white/10 hover:bg-white/15`
- **Efekt na użytkownika**: Karty psów nie używają tokenów semantycznych — nie adaptują się do motywu.
- **Fix**: Zamienić na `border border-border bg-card/50 hover:bg-card transition-colors` (lub użyć DogCard z C1).

## Odpowiedź na pytanie architektoniczne

**Wylogowany**: Middleware (`src/middleware.ts:5,20-26`) chroni `/dogs` — niezalogowani redirectowani na `/auth/signin`. Widok niedostępny.

**Brak psów (empty state)**: Widok pokazuje "No dogs yet — add your first!" z linkiem (linia 45-48). UX poprawny, ale styling z hardkodowanymi kolorami (C5).

**Bezpośredni link**: Każdy pies to `href="/dogs/${dog.id}"`. Emoji fallback 🐾 gdy brak `dog.photoUrl`.
