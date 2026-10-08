# Research: ui-owners

## Widok
`src/pages/owners/index.astro`

## Źródło tokenów
`src/styles/global.css` — `:root`/`.dark` CSS vars + `@theme inline`

## Komponenty współdzielone w repo
- `src/components/ui/button.tsx` — shadcn Button
- `src/components/ui/LibBadge.astro` — własny badge

## Charge List

### C1 — Missing tokens: Hardcoded blue/purple gradient in title
- **Plik:linia**: `src/pages/owners/index.astro:41`
- **Klasy/kod**: `bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent`
- **Efekt na użytkownika**: Tytuł nie respektuje systemu tokenów, co powoduje niespójność wizualną przy zmianie schematu kolorów.
- **Fix**: Użyć tokenów `bg-gradient-to-r from-primary to-accent` lub pojedynczego `text-foreground` bez gradientu.

### C2 — Missing tokens: Hardcoded blue colors w info messageach
- **Plik:linia**: `src/pages/owners/index.astro:47, 57-59, 63`
- **Klasy/kod**: `bg-white/10`, `text-blue-100/80`, `bg-blue-900/30`, `border-blue-500/30`, `text-blue-200`
- **Efekt na użytkownika**: Info bannery i empty states wyglądają niezgodnie z projektowanym systemem kolorów w dark mode.
- **Fix**: Zastąpić `bg-blue-900/30` → `bg-card`, `text-blue-100/80` → `text-muted-foreground`, `border-blue-500/30` → `border-border`.

### C3 — Missing token: Hardkodowany purple dla linków
- **Plik:linia**: `src/pages/owners/index.astro:49-50, 65-67`
- **Klasy/kod**: `text-purple-300 hover:underline`
- **Efekt na użytkownika**: Linki do profilu wyglądają niezgodnie z systemem kolorów i mogą być niewidoczne w jasnym trybie.
- **Fix**: Użyć `text-primary hover:underline` lub `text-accent`.

### C4 — Missing shared component: Info banner zamiast Alert
- **Plik:linia**: `src/pages/owners/index.astro:57-60`
- **Klasy/kod**: `<p class="mb-4 rounded-lg border border-blue-500/30 bg-blue-900/30 px-3 py-2 text-sm text-blue-200">`
- **Efekt na użytkownika**: Informacja o fallbacku na miasto nie używa standaryzowanego komponentu, trudniej zarządzać stylami.
- **Fix**: Utworzyć Alert.astro komponent (lub użyć gotowego z shadcn) dla wiadomości info/warning/error.

### C5 — Accidental architecture: Owner cards z surowych divów
- **Plik:linia**: `src/pages/owners/index.astro:71-102`
- **Klasy/kod**: `<a> <img> <div class="min-w-0 flex-1"> <p> <p>...`
- **Efekt na użytkownika**: Karty są funkcjonalne, ale brakuje standaryzowanego Card komponentu do zarządzania konsystentnie w całej apce.
- **Fix**: Utworzyć Card.tsx (shadcn) lub Card.astro wrapper z `bg-card`, `text-card-foreground`, border-border.

## Odpowiedź na pytanie architektoniczne

**Wylogowany**: Middleware (`src/middleware.ts:22-25`) redirectuje do `/auth/signin` zanim request dotrze do `/owners`. Użytkownik wylogowany nigdy nie widzi tego widoku — pełna ochrona.

**Brak danych**: Gdy użytkownik nie ma `city` ustawionym → wyświetla się placeholder div z linkiem do profilu (`lines 46-53`). Gdy mnie miasto ale nie ma właścicieli w dzielnicy → fallback na city-wide (`lines 24-29`, pokazuje info banner o fallbacku). Gdy w mieście nie ma nikogo → empty state z linkiem do aktualizacji profilu.

**Bezpośredni link**: Filtrowanie po dzielnicy jest poprawne — logika `listOwners(city, district)` następnie `listOwners(city)` jeśli district ma 0 wyników (`lines 21-32`). Jeśli profil niekompletny (brak city), fallback pokazuje instrukcję — architektura bezpieczna.
