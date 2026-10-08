# Research: ui-owner-detail

## Widok
`src/pages/owners/[id].astro`

## Źródło tokenów
`src/styles/global.css` — `:root`/`.dark` CSS vars + `@theme inline`

## Komponenty współdzielone w repo
- `src/components/ui/button.tsx`
- `src/components/ui/LibBadge.astro`

## Charge List

### C1 — Missing tokens: Hardkodowane kolory tekstu zamiast zmiennych systemowych
- **Plik:linia**: `src/pages/owners/[id].astro:38,40,63,71,88`
- **Klasy/kod**: `text-blue-100/80`, `text-purple-300`, `text-blue-100/70`, `text-blue-100/60`
- **Efekt na użytkownika**: Kolory nie będą konsystentne ze zmianami systemu tokenów — zmiana palety wymaga ręcznej edycji wielu linii.
- **Fix**: Zamienić na `text-muted-foreground` (lub `text-primary` dla akcentów).

### C2 — Missing tokens: Wyłączony przycisk używa hardkodowanego semi-transparent purple
- **Plik:linia**: `src/pages/owners/[id].astro:108-113`
- **Klasy/kod**: `bg-purple-600/50 text-white/50` zamiast `disabled:opacity-50`
- **Efekt na użytkownika**: Stan disabled wygląda inaczej niż inne przyciski w systemie — brak spójnego hover/focus stanu.
- **Fix**: Usunąć hardkodowany styl i pozwolić button.tsx obsłużyć `disabled:opacity-50 disabled:pointer-events-none`.

### C3 — Missing tokens: Alerty (success/error) mają hardkodowane kolory
- **Plik:linia**: `src/pages/owners/[id].astro:97-104`
- **Klasy/kod**: `border-green-500/30 bg-green-900/30 text-green-200` (success), `border-red-500/30 bg-red-900/30 text-red-200` (error)
- **Efekt na użytkownika**: Kolory alertów nie odzwierciedlają systemu tokenów.
- **Fix**: Zdefiniować `--success` token w global.css; użyć `border-destructive bg-destructive/10` dla błędów.

### C4 — Missing shared component: Trzy stany budowane ręcznie z powtarzalnym HTML
- **Plik:linia**: `src/pages/owners/[id].astro:37-44,46-131,134-141`
- **Klasy/kod**: `<div class="w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 p-8 text-center text-white backdrop-blur-xl">` powtórzone w każdym stanie
- **Efekt na użytkownika**: Zmiana stylu kart wymaga edycji 3 miejsc zamiast jednego komponentu.
- **Fix**: Stworzyć `<GlassCard>` lub `<OwnerCard>` komponent w `src/components/ui/`.

### C5 — Missing shared component: Przyciski zaproszenia zbudowane ręcznie
- **Plik:linia**: `src/pages/owners/[id].astro:108-113,115-124`
- **Klasy/kod**: Surowe `<button>` i `<form><button>` z inline klasami zamiast `<Button>` z button.tsx
- **Efekt na użytkownika**: Brak spójnego fokus/hover/disabled stanu; gradient nie używa primary token.
- **Fix**: Użyć `<Button variant="default">` i `<Button disabled>` dla stanów zaproszenia.

### C6 — Accidental architecture: Brak HTTP 404 dla nieistniejącego właściciela
- **Plik:linia**: `src/pages/owners/[id].astro:133-141`
- **Klasy/kod**: Strona zwraca status 200 z komunikatem "Owner not found."
- **Efekt na użytkownika**: Boty/SEO indeksują pustą stronę jako valid page; trudniej debugować błędy.
- **Fix**: Dodać `Astro.response.status = 404;` w frontmatter przy `if (!profile)`.

### C7 — Accidental architecture: Własny profil pokazuje niejasny komunikat zamiast edytora
- **Plik:linia**: `src/pages/owners/[id].astro:36-44`
- **Klasy/kod**: `isOwnProfile` → komunikat "This is your profile. Go to your profile."
- **Efekt na użytkownika**: Użytkownik wchodzący na własne `/owners/[id]` widzi tylko komunikat z linkiem — zamiast tego powinien być redirect lub widok edytora.
- **Fix**: Dodać `return Astro.redirect('/profile')` gdy `isOwnProfile`, zamiast renderowania placeholder komunikatu.

## Odpowiedź na pytanie architektoniczne

**Wylogowany**: Middleware (PROTECTED_ROUTES) blokuje i redirectuje na `/auth/signin`. Prawidłowo.

**Własny profil** (`id === user.id`): Widzi komunikat "This is your profile. Go to your profile." — architecturalnie lepszym rozwiązaniem byłby redirect do `/profile`.

**Nieistniejący właściciel**: Strona zwraca HTTP 200 z komunikatem "Owner not found." — powinno być 404.

**Cudzy właściciel (zalogowany)**: Pokazuje profil z psami i przyciskami zaproszenia. Logika pending/send prawidłowo zaimplementowana, ale brakuje komponentyzacji.
