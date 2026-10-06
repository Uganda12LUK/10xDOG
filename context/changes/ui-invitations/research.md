# Research: ui-invitations

## Widok
`src/pages/invitations/index.astro`

## Źródło tokenów
`src/styles/global.css` — `:root`/`.dark` CSS vars + `@theme inline`

## Komponenty współdzielone w repo
- `src/components/ui/button.tsx`
- `src/components/ui/LibBadge.astro`
- `src/components/Banner.astro` (używany w Layout dla globalnych błędów)

## Charge List

### C1 — Missing tokens: Hardkodowane kolory przycisków Accept/Decline
- **Plik:linia**: `src/pages/invitations/index.astro:80-95`
- **Klasy/kod**: Accept: `bg-green-600/80`, Decline: `bg-red-600/60`
- **Efekt na użytkownika**: Przyciski używają kolorów spoza systemu tokenów (shadcn), naruszając design consistency.
- **Fix**: Użyć `<Button>` z `variant="default"` (Accept) i `variant="destructive"` (Decline); lub dodać `--success` token do global.css.

### C2 — Missing tokens: Hardkodowane bannery sukces/błąd
- **Plik:linia**: `src/pages/invitations/index.astro:45-52`
- **Klasy/kod**: Success: `border-green-500/30 bg-green-900/30 text-green-200`, Error: `border-red-500/30 bg-red-900/30 text-red-200`
- **Efekt na użytkownika**: Bannery używają ad-hoc stylingu zamiast systemu tokenów.
- **Fix**: Użyć `src/components/Banner.astro` z prop `variant="success" | "error"`.

### C3 — Missing shared component: Karty zaproszeń z surowych div
- **Plik:linia**: `src/pages/invitations/index.astro:73-97`
- **Klasy/kod**: `<li class="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">`
- **Efekt na użytkownika**: Powtarzająca się struktura kart bez komponentu — trudna do utrzymania konsystencji.
- **Fix**: Wyciągnąć do `src/components/InvitationCard.astro` z props: `name`, `status` ("incoming" | "outgoing"), `actions?`.

### C4 — Missing shared component: Przyciski Accept/Decline zamiast Button
- **Plik:linia**: `src/pages/invitations/index.astro:80-95`
- **Klasy/kod**: Surowe `<button>` z inline klasami
- **Efekt na użytkownika**: Przyciski nie mają consistent focus ring, hover states ani accessibility z Button komponentu.
- **Fix**: Użyć `src/components/ui/button.tsx` z `variant="default"` (Accept) i `variant="destructive"` (Decline).

### C5 — Missing tokens: Tekst pomocniczy sekcji Incoming/Outgoing
- **Plik:linia**: `src/pages/invitations/index.astro:64,106`
- **Klasy/kod**: `text-blue-100/60`
- **Efekt na użytkownika**: Label tekstowe sekcji używają hardkodowanego opacity zamiast tokenów.
- **Fix**: Zamienić na `text-muted-foreground`.

### C6 — Accidental architecture: Sekcja "Outgoing" ukrywana gdy pusta
- **Plik:linia**: `src/pages/invitations/index.astro:104-122`
- **Klasy/kod**: `{sentInvitations.length > 0 ? (...) : null}`
- **Efekt na użytkownika**: Sekcja "Outgoing" jest niewidoczna gdy brak zaproszeń wychodzących — asymetria z "Incoming" (która pokazuje placeholder). Użytkownik może nie wiedzieć, że może wysyłać zaproszenia.
- **Fix**: Zawsze pokazywać sekcję "Outgoing" z placeholder `<p>You haven't sent any invitations yet.</p>`.

## Odpowiedź na pytanie architektoniczne

**Wylogowany**: Middleware (`src/middleware.ts:22-26`) redirectuje na `/auth/signin`. Użytkownik nigdy nie widzi `/invitations`. Prawidłowo.

**Brak zaproszeń**: Sekcja "Incoming" pokazuje "No pending invitations" z linkiem do `/owners`. Sekcja "Outgoing" jest ukrywana — asymetria UX.

**Bezpośredni link**: Protected route w middleware. Wylogowany → redirect na signin. Zalogowany bez profilu → redirect na `/profile?onboarding=1`. Zalogowany z profilem → strona ładuje się prawidłowo.
