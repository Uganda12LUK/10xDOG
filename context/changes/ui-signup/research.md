# Research: ui-signup

## Widok
`src/pages/auth/signup.astro` + `src/components/auth/SignUpForm.tsx`

## Źródło tokenów
`src/styles/global.css` — `:root`/`.dark` CSS vars + `@theme inline`

## Komponenty współdzielone w repo
- `src/components/ui/button.tsx`
- `src/components/auth/FormField.tsx`
- `src/components/auth/SubmitButton.tsx`

## Charge List

### C1 — Missing tokens: Hardkodowane kolory na karcie i nagłówku
- **Plik:linia**: `src/pages/auth/signup.astro:10-11,15,17`
- **Klasy/kod**: `border-white/10`, `bg-white/10`, `from-blue-200 to-purple-200`, `text-blue-100/60`, `text-purple-300`
- **Efekt na użytkownika**: Karta i nagłówek nie odzwierciedlają amber brand color — niebieskopurpurowy gradient ignoruje `--primary` token.
- **Fix**: `border-border`, `bg-card`, `text-muted-foreground`, gradient: `from-primary to-primary/80`, link: `text-primary`.

### C2 — Missing tokens: Hardkodowane kolory w FormField i SubmitButton
- **Plik:linia**: `src/components/auth/FormField.tsx:37,41,53,59`, `src/components/auth/SubmitButton.tsx:18`
- **Klasy/kod**: `text-blue-100/80`, `text-white/40`, `border-red-400/60`, `focus:ring-red-400`, `focus:ring-purple-400`, `text-red-300`, `bg-purple-600 hover:bg-purple-500`
- **Efekt na użytkownika**: Pola formularza i przycisk submit używają hardkodowanych kolorów — nie adaptują się do zmian systemu tokenów.
- **Fix**: `text-muted-foreground`, `border-destructive`, `focus:ring-destructive`, `bg-primary hover:bg-primary/90`.

### C3 — Missing tokens: Hint do hasła z hardkodowanym kolorem
- **Plik:linia**: `src/components/auth/SignUpForm.tsx:59`
- **Klasy/kod**: `text-blue-100/50`
- **Efekt na użytkownika**: Tekst pomocniczy przy polu hasła nie używa `text-muted-foreground`.
- **Fix**: Zamienić na `text-muted-foreground`.

### C4 — Missing shared component: Zduplikowany layout karty auth
- **Plik:linia**: `src/pages/auth/signup.astro:8-25` vs `src/pages/auth/signin.astro`
- **Klasy/kod**: Identyczna struktura karty (`rounded-2xl border border-white/10 bg-white/10 p-8 backdrop-blur-xl`) w obu plikach
- **Efekt na użytkownika**: Zmiana stylu kart auth wymaga edycji dwóch plików zamiast jednego komponentu.
- **Fix**: Stworzyć `src/components/auth/AuthCard.astro` reużywany na signin i signup.

### C5 — Accidental architecture: Zalogowany użytkownik może wejść na /auth/signup
- **Plik:linia**: `src/middleware.ts:29-31`
- **Klasy/kod**: Middleware redirectuje z `/` dla zalogowanych, ale nie z `/auth/signup`
- **Efekt na użytkownika**: Zalogowany użytkownik może trafić na formularz rejestracji — powinien być przekierowany na `/dashboard`.
- **Fix**: Dodać w frontmatter: `if (Astro.locals.user) return Astro.redirect('/dashboard')` lub rozszerzyć logikę middleware.

## Odpowiedź na pytanie architektoniczne

**Już zalogowany**: Middleware nie redirectuje z `/auth/signup` — zalogowany użytkownik widzi formularz rejestracji. Brak zabezpieczenia.

**Błąd rejestracji**: FormField pokazuje błędy walidacji pod polami. Brak global error baner na poziomie strony.

**Zduplikowany layout**: Tak — `signup.astro` i `signin.astro` mają identyczną strukturę HTML karty. Brakuje wspólnego `AuthCard.astro` komponentu.
