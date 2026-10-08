# Research: ui-dashboard

## Widok
`src/pages/dashboard.astro`

## Źródło tokenów
`src/styles/global.css` — `:root`/`.dark` CSS vars + `@theme inline`

## Komponenty współdzielone w repo
- `src/components/ui/button.tsx` — shadcn Button (używa `bg-primary`, `text-primary-foreground`)
- `src/components/ui/LibBadge.astro` — własny badge z hardkodowanymi kolorami

## Charge List

### C1 — Missing tokens: Hardkodowane kolory Blue/Purple zamiast systemu tokenów
- **Plik:linia**: `src/pages/dashboard.astro:10,13,16`
- **Klasy/kod**: `from-blue-200 to-purple-200`, `text-blue-100/80`, `text-blue-100/50`
- **Efekt na użytkownika**: Widok ignoruje PawMeet design system (amber primary + grayscale) — nagłówek "Dashboard" jest niebiesko-fioletowy zamiast amber (brand color).
- **Fix**: Zamień gradient na `from-primary to-accent` i tekst na `text-muted-foreground`.

### C2 — Missing tokens: Border/background używają white/opacity zamiast tokenów
- **Plik:linia**: `src/pages/dashboard.astro:9,20`
- **Klasy/kod**: `border-white/10`, `bg-white/10`, `hover:bg-white/20`
- **Efekt na użytkownika**: Karta i przycisk nie respektują design tokeny — nie adaptują się do żadnej zmiany motywu.
- **Fix**: `border-border`, `bg-card`, `hover:bg-accent`. Dla przycisku: użyć istniejącego `<Button>` z button.tsx.

### C3 — Missing shared component: Karta/kontener powinien być komponentem
- **Plik:linia**: `src/pages/dashboard.astro:8-26`
- **Klasy/kod**: `<div class="... rounded-2xl border border-white/10 bg-white/10 p-8 text-center ... backdrop-blur-xl">`
- **Efekt na użytkownika**: Ta sama struktura karty pojawia się w wielu miejscach (sign-in, sign-up, profile itd.) — zmiana radii lub paddingu wymaga edycji każdego pliku osobno.
- **Fix**: Stworzyć `src/components/ui/Card.astro` z `bg-card`, `border-border`, tokenami.

### C4 — Accidental architecture: Brak obsługi stanu "pusta zawartość" / onboarding
- **Plik:linia**: `src/pages/dashboard.astro:13-15`
- **Klasy/kod**: `Welcome, <span>{user?.email}</span>` + `This page is only for authenticated users.`
- **Efekt na użytkownika**: Dashboard pokazuje tylko email i Sign Out — użytkownik nie wie co robić dalej po zalogowaniu.
- **Fix**: Pokazać CTA "Uzupełnij profil" lub listę kroków onboardingu zamiast statycznej wiadomości.

### C5 — Accidental architecture: Brak fallback dla user === null
- **Plik:linia**: `src/pages/dashboard.astro:4` + `src/middleware.ts:5,22-26`
- **Klasy/kod**: `const { user } = Astro.locals;` — brak fallback renderowania
- **Efekt na użytkownika**: Middleware blokuje dostęp, ale strona sama nie ma defensywnego render — `user?.email` renderuje pustą wartość zamiast fallback UI.
- **Fix**: Dodać `if (!user) return Astro.redirect('/auth/signin')` w frontmatter jako defensywne kodowanie.

## Odpowiedź na pytanie architektoniczne

**Wylogowany**: Middleware `PROTECTED_ROUTES` blokuje dostęp i redirectuje na `/auth/signin`. Strona nie jest widoczna.

**Brak danych**: Middleware sprawdza profil — jeśli brak, redirectuje na `/profile?onboarding=1`. Jednak dashboard.astro sam w sobie pokazuje tylko email + Sign Out bez żadnej nawigacji ani CTA.

**Bezpośredni link**: Zalogowany użytkownik bez profilu jest redirectowany do `/profile?onboarding=1` przed wejściem na dashboard (middleware soft onboarding).
