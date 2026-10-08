# Research: ui-signin

## Widok
`src/pages/auth/signin.astro` + `src/components/auth/SignInForm.tsx`

## Źródło tokenów
`src/styles/global.css` — `:root`/`.dark` CSS vars + `@theme inline`

## Komponenty współdzielone w repo
- `src/components/ui/button.tsx`
- `src/components/auth/FormField.tsx`
- `src/components/auth/SubmitButton.tsx`
- `src/components/auth/ServerError.tsx`

## Charge List

### C1 — Missing tokens: Hardkodowane kolory na karcie, nagłówku i tekście
- **Plik:linia**: `src/pages/auth/signin.astro:10-11,15,17`, `src/components/auth/FormField.tsx:37,53`
- **Klasy/kod**: `border-white/10 bg-white/10`, `from-blue-200 to-purple-200`, `text-blue-100/60`, `text-purple-300`, `text-blue-100/80`, `border-red-400/60 focus:ring-red-400`, `focus:ring-purple-400`
- **Efekt na użytkownika**: Cała strona logowania ignoruje design system tokenów — niebieskopurpurowy wygląd nie pasuje do amber brand color.
- **Fix**: `border-border`, `bg-card`, `text-muted-foreground`, `text-primary`, gradient `from-primary to-primary/80`, błędy `border-destructive focus:ring-destructive`, focus `focus:ring-ring`.

### C2 — Missing tokens: SubmitButton i ServerError z hardkodowanymi kolorami
- **Plik:linia**: `src/components/auth/SubmitButton.tsx:18`, `src/components/auth/ServerError.tsx:11`
- **Klasy/kod**: `bg-purple-600 hover:bg-purple-500`, `border-red-500/30 bg-red-900/30 text-red-300`
- **Efekt na użytkownika**: Przycisk submit i komunikat błędu serwera nie używają tokenów systemowych.
- **Fix**: SubmitButton: `bg-primary hover:bg-primary/90 text-primary-foreground`. ServerError: stworzyć `Alert.tsx` z `variant="destructive"` używającym `--destructive` tokenu.

### C3 — Missing shared component: Link "Sign up" jako `<a>` zamiast `<Button variant="link">`
- **Plik:linia**: `src/pages/auth/signin.astro:17-19`
- **Klasy/kod**: `<a href="/auth/signup" class="text-purple-300 ...">`
- **Efekt na użytkownika**: Link nie ma consistent focus ring ani hover state z design systemu.
- **Fix**: Użyć `<Button variant="link">` z button.tsx lub Astro wrapper.

### C4 — Missing shared component: ServerError nie jest oparty na wspólnym Alert
- **Plik:linia**: `src/components/auth/ServerError.tsx:11`
- **Klasy/kod**: Standalone komponent z hardkodowaną czerwienią — wzorzec nie jest reużywany
- **Efekt na użytkownika**: Komunikaty błędów w różnych miejscach aplikacji mają niespójny wygląd.
- **Fix**: Stworzyć `src/components/ui/Alert.tsx` z CVA wariantami (error, warning, success, info).

### C5 — Accidental architecture: Zalogowany użytkownik może wejść na /auth/signin
- **Plik:linia**: `src/middleware.ts:29-31`
- **Klasy/kod**: Middleware redirectuje z `/` dla zalogowanych, ale nie z `/auth/signin`
- **Efekt na użytkownika**: Zalogowany użytkownik widzi formularz logowania zamiast być przekierowanym na dashboard.
- **Fix**: Dodać w middleware: `if (context.locals.user && pathname.startsWith("/auth/")) return context.redirect("/dashboard")`.

### C6 — Accidental architecture: Komunikat błędu przechowywany w URL query param
- **Plik:linia**: `src/pages/api/auth/signin.ts:16`
- **Klasy/kod**: `return context.redirect('/auth/signin?error=${encodeURIComponent(error.message)}')`
- **Efekt na użytkownika**: Komunikaty błędów (w tym potencjalnie wrażliwe) zapisują się w historii przeglądarki i mogą wyciec przez referrer.
- **Fix**: Przechowywać błąd w cookie sesji lub zawsze używać generycznego "Invalid credentials" zamiast rzeczywistego komunikatu.

## Odpowiedź na pytanie architektoniczne

**Już zalogowany**: Middleware nie redirectuje z `/auth/signin` — zalogowany użytkownik widzi formularz logowania. Brak zabezpieczenia.

**Błąd logowania**: Komunikat błędu przechowywany w `?error=` query param — widoczny w historii przeglądarki i URL barze.

**Bezpośredni link**: Niezalogowani — normalne działanie. Zalogowani — powinni być przekierowani na `/dashboard` (nie jest zaimplementowane).
