# Research: ui-dogs-new

## Widok
`src/pages/dogs/new.astro` + `src/components/dogs/DogForm.tsx`

## Źródło tokenów
`src/styles/global.css` — `:root`/`.dark` CSS vars + `@theme inline`

## Komponenty współdzielone w repo
- `src/components/ui/button.tsx`
- `src/components/ui/LibBadge.astro`
- `src/components/auth/FormField.tsx` (używany dla pola "name" w DogForm)
- `src/components/auth/SubmitButton.tsx`

## Charge List

### C1 — Missing tokens: Labele hardkodują `text-blue-100/80`
- **Plik:linia**: `src/components/dogs/DogForm.tsx:67,94,114`
- **Klasy/kod**: `className="mb-1 block text-sm text-blue-100/80"`
- **Efekt na użytkownika**: Labele pól breed, birthdate, photo używają hardkodowanego niebieskiego — nie pasują do amber brand color.
- **Fix**: Zamienić na `text-muted-foreground`.

### C2 — Missing tokens: Select i input hardkodują kolory border/bg/text
- **Plik:linia**: `src/components/dogs/DogForm.tsx:78,107`
- **Klasy/kod**: `border border-white/20 bg-white/10 text-white focus:ring-2 focus:ring-purple-400`
- **Efekt na użytkownika**: Pola formularza nie używają tokenów — brak adaptacji do zmian motywu; `focus:ring-purple-400` nie używa `--ring` tokenu.
- **Fix**: Zamienić na `border-border bg-input text-foreground focus:ring-ring`.

### C3 — Missing shared component: Select i input do breed/birthdate budowane ręcznie
- **Plik:linia**: `src/components/dogs/DogForm.tsx:66-91,93-111`
- **Klasy/kod**: Ręczne `<label>` + `<select>` / `<input type="date">` bez wrapperów
- **Efekt na użytkownika**: Niespójność wizualna — pole "name" używa `FormField` komponentu, breed i birthdate są zbudowane ręcznie.
- **Fix**: Rozszerzyć `FormField` o warianty `select` i `date`, lub stworzyć `FormFieldSelect.tsx`, `FormFieldDate.tsx`.

### C4 — Missing tokens: SubmitButton z hardkodowanym purple
- **Plik:linia**: `src/components/auth/SubmitButton.tsx:18`
- **Klasy/kod**: `bg-purple-600 px-4 py-2 hover:bg-purple-500`
- **Efekt na użytkownika**: Przycisk submit używa hardkodowanego purple zamiast `bg-primary` — nie odzwierciedla amber brand color.
- **Fix**: Zamienić na `bg-primary text-primary-foreground hover:bg-primary/90` lub użyć `<Button>` z button.tsx.

### C5 — Accidental architecture: Walidacja tylko dla pola "name"
- **Plik:linia**: `src/components/dogs/DogForm.tsx:23-32`
- **Klasy/kod**: `validate()` sprawdza tylko `if (!name.trim())`
- **Efekt na użytkownika**: Użytkownik może wysłać formularz z pustym breed lub datą w przyszłości bez lokalnego feedbacku — błąd pojawia się dopiero po wysłaniu do serwera.
- **Fix**: Dodać walidację dla breed (required) i birthdate (np. nie może być w przyszłości).

### C6 — Missing shared component: File input bez accessibility
- **Plik:linia**: `src/components/dogs/DogForm.tsx:113-135`
- **Klasy/kod**: Ręczny `<input type="file">` bez informacji o akceptowanych typach w wizualnym feedbacku
- **Efekt na użytkownika**: Brak wizualnej informacji o akceptowanych typach plików (np. "JPG, PNG, max 5MB") — użytkownik może próbować wgrać nieobsługiwane pliki.
- **Fix**: Dodać tekst pomocniczy pod inputem; rozważyć stworzenie `FormFieldFile.tsx`.

## Odpowiedź na pytanie architektoniczne

**Wylogowany**: Middleware (`src/middleware.ts:5,20-26`) chroni `/dogs` — niezalogowani redirectowani na `/auth/signin`. Formularz niedostępny.

**Błąd walidacji**: Tylko pole "name" ma walidację po stronie klienta z visual feedbackiem w `FormField`. Breed i birthdate — brak walidacji.

**Bezpośredni link**: Dostępny tylko dla zalogowanych. Middleware chroni trasę prawidłowo.
