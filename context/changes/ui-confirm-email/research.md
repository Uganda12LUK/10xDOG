# Research: ui-confirm-email

## Widok
`src/pages/auth/confirm-email.astro`

## Źródło tokenów
`src/styles/global.css` — `:root`/`.dark` CSS vars + `@theme inline`

## Komponenty współdzielone w repo
- `src/components/ui/button.tsx`
- `src/components/ui/LibBadge.astro`

## Charge List

### C1 — Missing tokens: Hardkodowane kolory zamiast CSS vars
- **Plik:linia**: `src/pages/auth/confirm-email.astro:23,25,28,29`
- **Klasy/kod**: `border-white/10`, `bg-white/10`, `from-blue-200 to-purple-200`, `text-white`, `text-blue-100/80`, `text-purple-300`
- **Efekt na użytkownika**: Strona ignoruje design system — gradient nagłówka nie odzwierciedla amber brand color; kolory nie zmienią się przy aktualizacji palety.
- **Fix**: Zamienić na `border-border`, `bg-card`, `text-card-foreground`, `text-muted-foreground`, `text-primary`. Gradient: `from-primary to-primary/80`.

### C2 — Missing shared component: Link jako `<a>` zamiast `<Button variant="link">`
- **Plik:linia**: `src/pages/auth/confirm-email.astro:29-31`
- **Klasy/kod**: `<a href="/auth/signin" class="text-sm text-purple-300 hover:underline">`
- **Efekt na użytkownika**: Link nie ma wbudowanego focus ring ani spójnego stylu z resztą aplikacji.
- **Fix**: Użyć `<Button variant="link" size="sm">` lub odpowiednika Astro z `text-primary`.

### C3 — Missing shared component: Emoji zamiast styled success indicator
- **Plik:linia**: `src/pages/auth/confirm-email.astro:8,24`
- **Klasy/kod**: `{ emoji: "✅" }` / `{ emoji: "📧" }` renderowane jako `<div class="mb-4 text-5xl">`
- **Efekt na użytkownika**: Emoji renderuje się inaczej na różnych systemach operacyjnych; brak semantycznej ikony z dostępnym `aria-label`.
- **Fix**: Zamienić na ikonę SVG z `lucide-react` (np. `<CheckCircle2>` / `<Mail>`) stylizowaną `text-primary` + `aria-label`.

### C4 — Accidental architecture: Brak obsługi tokenu potwierdzającego email
- **Plik:linia**: `src/pages/auth/confirm-email.astro` (brak query param handling)
- **Klasy/kod**: Strona pokazuje tylko emoji na podstawie `import.meta.env.DEV` — nie obsługuje `?token=xyz` z maila
- **Efekt na użytkownika**: Użytkownik klikający link z maila nie jest automatycznie potwierdzany — strona nie wykonuje żadnej akcji z tokenem.
- **Fix**: Dodać handler query param `token` → wywołanie Supabase `verifyOtp()` → redirect na `/auth/signin?confirmed=1`.

### C5 — Accidental architecture: Zalogowany użytkownik może wejść na stronę confirm-email
- **Plik:linia**: `src/middleware.ts:5` (brak `/auth/confirm-email` w PROTECTED_ROUTES ani w redirect logic)
- **Klasy/kod**: Middleware nie sprawdza stanu auth dla `/auth/confirm-email`
- **Efekt na użytkownika**: Już zalogowany użytkownik widzi stronę "Check your email" zamiast być przekierowany na `/dashboard`.
- **Fix**: W frontmatter strony: `if (Astro.locals.user) return Astro.redirect('/dashboard')`.

## Odpowiedź na pytanie architektoniczne

**Bez rejestracji**: Middleware nie blokuje `/auth/confirm-email` — strona dostępna dla każdego. Użytkownik widzi "Check your email" z linkiem do sign-in.

**Już zalogowany**: Middleware go nie redirectuje — może zobaczyć stronę confirm-email. Logika nie rozróżnia stanu auth.

**Po potwierdzeniu emaila**: Brak handlera dla tokenu — link z emaila powinien trafiać na `/api/auth/confirm?token=xyz`, a nie na tę stronę statyczną.
