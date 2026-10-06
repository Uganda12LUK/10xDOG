# Research: ui-dog-detail

## Widok
`src/pages/dogs/[id].astro` + `src/components/dogs/DogForm.tsx`

## Źródło tokenów
`src/styles/global.css` — `:root`/`.dark` CSS vars + `@theme inline`

## Komponenty współdzielone w repo
- `src/components/ui/button.tsx`
- `src/components/ui/LibBadge.astro`
- `src/components/auth/FormField.tsx`
- `src/components/auth/SubmitButton.tsx`

## Charge List

### C1 — Missing tokens: Hardkodowane kolory w głównym kontenerze
- **Plik:linia**: `src/pages/dogs/[id].astro:22-23`
- **Klasy/kod**: `border-white/10 bg-white/10 text-white`
- **Efekt na użytkownika**: Kontener używa arbitrary white opacity zamiast tokenów — brak spójności z design systemem.
- **Fix**: Zamienić na `border-border bg-card text-card-foreground`.

### C2 — Missing tokens: Hardkodowany gradient w tytule
- **Plik:linia**: `src/pages/dogs/[id].astro:23`
- **Klasy/kod**: `from-blue-200 to-purple-200`
- **Efekt na użytkownika**: Tytuł psa używa niebieskopurpurowego gradientu — niespójny z amber brand color.
- **Fix**: Użyć `text-primary` lub stworzyć token `gradient-heading` w global.css.

### C3 — Missing tokens: Hardkodowane kolory w stanie błędu (not found)
- **Plik:linia**: `src/pages/dogs/[id].astro:38-42`
- **Klasy/kod**: `text-blue-100/70`, `text-purple-300`
- **Efekt na użytkownika**: Komunikat "Dog not found" i link do powrotu używają arbitralnych kolorów.
- **Fix**: Zamienić na `text-muted-foreground` i `text-primary`.

### C4 — Missing tokens: Przycisk Delete stylowany ręcznie
- **Plik:linia**: `src/pages/dogs/[id].astro:32-34`
- **Klasy/kod**: `text-red-300 hover:text-red-200 hover:underline`
- **Efekt na użytkownika**: Przycisk usuwania nie używa `Button` komponentu ani tokenu `--destructive`.
- **Fix**: Użyć `<Button variant="ghost" class="text-destructive hover:text-destructive">` lub stworzyć wariant `destructive-ghost`.

### C5 — Missing shared component: Pola DogForm budowane ręcznie
- **Plik:linia**: `src/components/dogs/DogForm.tsx:67-91,93-111,124-134`
- **Klasy/kod**: Select/input/file zbudowane inline: `rounded-lg border border-white/20 bg-white/10 focus:ring-2 focus:ring-purple-400`
- **Efekt na użytkownika**: Pola formularza psów nie używają spójnego wzorca FormField — każde ma własne style z hardkodowanymi kolorami.
- **Fix**: Stworzyć warianty `FormFieldSelect`, `FormFieldDate`, `FormFieldFile` lub rozszerzyć istniejący `FormField`.

### C6 — Missing tokens: SubmitButton z hardkodowanym purple
- **Plik:linia**: `src/components/auth/SubmitButton.tsx:18`
- **Klasy/kod**: `bg-purple-600 hover:bg-purple-500`
- **Efekt na użytkownika**: Przycisk submit używa hardkodowanego purple zamiast `bg-primary`.
- **Fix**: Zamienić na `bg-primary text-primary-foreground hover:bg-primary/90`.

### C7 — Accidental architecture: Brak weryfikacji własności psa na poziomie strony
- **Plik:linia**: `src/pages/dogs/[id].astro:13-15`
- **Klasy/kod**: `if (supabase && user && id) { dog = await getDog(supabase, id); }` — bez sprawdzenia `dog.ownerId`
- **Efekt na użytkownika**: Zalogowany użytkownik może zobaczyć szczegóły cudzego psa znając jego ID. RLS chroni zapisy, ale nie odczyty.
- **Fix**: Dodać po fetch: `if (dog && dog.ownerId !== user.id) return Astro.redirect('/dogs');`

## Odpowiedź na pytanie architektoniczne

**Wylogowany**: Middleware (PROTECTED_ROUTES zawiera `/dogs`) redirectuje na `/auth/signin`. Prawidłowo.

**Brak danych / nieistniejący ID**: Strona gracefully pokazuje "Dog not found" z linkiem do `/dogs` — brak errora.

**Cudzy pies**: PROBLEM BEZPIECZEŃSTWA — zalogowany użytkownik może wyświetlić dane cudzego psa przez bezpośredni URL `/dogs/[id]`. API routes dla DELETE/UPDATE mają Supabase RLS weryfikujące własność, ale GET nie ma page-level authorization.
