# Research: ui-profile

## Widok
`src/pages/profile.astro` + `src/components/profile/ProfileForm.tsx`

## Źródło tokenów
`src/styles/global.css` — `:root`/`.dark` CSS vars + `@theme inline`

## Komponenty współdzielone w repo
- `src/components/ui/button.tsx`
- `src/components/ui/LibBadge.astro`
- `src/components/auth/FormField.tsx` (reużywane w profile)
- `src/components/auth/SubmitButton.tsx` (reużywane w profile)

## Charge List

### C1 — Missing tokens: Hardkodowane kolory w głównym kontenerze
- **Plik:linia**: `src/pages/profile.astro:23-26`
- **Klasy/kod**: `text-white`, `border-white/10`, `bg-white/10`, `from-blue-200 to-purple-200`
- **Efekt na użytkownika**: Nagłówek i kontener nie adaptują się do zmian systemu tokenów — zmiana palety wymaga ręcznej edycji HTML.
- **Fix**: Użyć `text-foreground`, `border-border`, `bg-card`, gradient zamienić na `from-primary to-accent`.

### C2 — Missing tokens: Hardkodowane kolory linku "Your dogs"
- **Plik:linia**: `src/pages/profile.astro:36`
- **Klasy/kod**: `text-purple-300`, `hover:text-purple-100`
- **Efekt na użytkownika**: Link do psów nie pasuje do amber brand color — wygląda niespójnie z resztą systemu.
- **Fix**: Zmienić na `text-primary` i `hover:text-primary/80`, lub użyć `<Button variant="link">`.

### C3 — Missing tokens: Hardkodowane kolory w ProfileForm
- **Plik:linia**: `src/components/profile/ProfileForm.tsx:53,94,111-112,119`
- **Klasy/kod**: `text-blue-200`, `bg-blue-900/30`, `border-blue-400/30`, `file:bg-purple-600`, `file:bg-purple-500`, `text-green-300`
- **Efekt na użytkownika**: Komunikaty informacyjne (onboarding, sukces) i file input wyglądają niezgodnie z systemem tokenów.
- **Fix**: Użyć `bg-accent/10`, `text-muted-foreground`, `bg-primary` dla file button; zdefiniować `--success` token w global.css dla `text-green-300`.

### C4 — Missing tokens: Hardkodowane kolory w FormField i SubmitButton
- **Plik:linia**: `src/components/auth/FormField.tsx:37,53-54`, `src/components/auth/SubmitButton.tsx:18`
- **Klasy/kod**: `text-blue-100/80`, `border-red-400/60`, `focus:ring-red-400`, `focus:ring-purple-400`, `bg-purple-600`, `hover:bg-purple-500`
- **Efekt na użytkownika**: Pola formularza w profilu wyglądają inaczej niż inne formularze (signin/signup) mimo że są tymi samymi komponentami.
- **Fix**: Przenieść FormField i SubmitButton do `src/components/ui/`, używać tokenów `text-muted-foreground`, `border-destructive`, `bg-primary`.

### C5 — Accidental architecture: Niejasny komunikat stanu onboarding/zapisany
- **Plik:linia**: `src/pages/profile.astro:21-42`, `src/components/profile/ProfileForm.tsx:52-56,119`
- **Klasy/kod**: Warunek `onboarding && !profile`, komunikat "Profile saved." bez timera
- **Efekt na użytkownika**: (1) Użytkownik nie wie czy profil jest obowiązkowy podczas onboardingu. (2) Komunikat "Profile saved." pozostaje widoczny jeśli użytkownik wróci z `?saved=1` — może być mylący.
- **Fix**: Pokazać "Complete your profile to get started" + dodać timeout dla success message lub jego reset po zmianie inputu.

## Odpowiedź na pytanie architektoniczne

**Wylogowany**: Middleware redirectuje na `/auth/signin` (middleware.ts:24). Strona niedostępna.

**Brak danych (nowy użytkownik)**: Middleware redirectuje na `/profile?onboarding=1` — widok pokazuje pusty formularz, ale komunikat onboardingu jest niejasny co do obowiązkowości profilu.

**Bezpośredni link**: Zalogowany użytkownik wchodzący z linku `/profile` widzi formularz profilu. Middleware chroni trasę.
