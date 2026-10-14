# Sentry — pozostałe ustawienia (po restarcie wróć tutaj)

Kod jest gotowy, zacommitowany i zweryfikowany na żywo (błędy klienta i serwera trafiają do Sentry).
To, co niżej, to **konfiguracja poza kodem**. Minimum do działania = sam DSN. Reszta to dodatki.

## Dane projektu (z wizardu Sentry)

- **DSN**: `https://874d078908842a220d34eeb65571e692@o4512250575978496.ingest.de.sentry.io/4512250585350224`
- **org**: `ukasz-majerski`
- **project**: `javascript-astro`
- **region**: DE (`ingest.de.sentry.io`)

## ✅ Już zrobione

- [x] DSN wpisany lokalnie w `.dev.vars` (gitignored) → `npm run preview` ma monitoring lokalnie.
- [x] Kod wszystkich 5 faz + przegląd (APPROVED) zacommitowane.

## ⬜ Do zrobienia (kolejność dowolna)

### 1. Produkcja Cloudflare — DSN serwera (potrzebne, by błędy SSR z proda leciały)
W terminalu projektu:
```powershell
npx wrangler secret put SENTRY_DSN
# po "Enter a secret value:" wklej DSN z góry
```
Opcjonalnie: `npx wrangler secret put SENTRY_ENV` → wartość `production` (można pominąć, kod domyślnie daje "production").

### 2. Produkcja — DSN klienta (błędy w przeglądarce na prodzie)
`PUBLIC_SENTRY_DSN` jest wklejany do bundla **przy buildzie**, więc przed deployem:
```powershell
$env:PUBLIC_SENTRY_DSN = "https://874d078908842a220d34eeb65571e692@o4512250575978496.ingest.de.sentry.io/4512250585350224"
npm run build
npx wrangler deploy
```

### 3. (Opcjonalne) Source maps w CI — czytelne stack trace zamiast zminifikowanych
Domyka kroki planu 4.4 / 4.5.

a) **Nowy auth token** w Sentry (stary był wklejony w czat — do rotacji):
   - Link: `https://ukasz-majerski.sentry.io/settings/auth-tokens/`
   - albo token konta: `https://sentry.io/settings/account/api/auth-tokens/`
   - „Create New Token" → skopiuj wartość `sntrys_...`

b) **GitHub → Settings → Secrets and variables → Actions → „New repository secret"** — dodaj 3:
   | Name | Secret (wartość) |
   |---|---|
   | `SENTRY_AUTH_TOKEN` | nowy token `sntrys_...` |
   | `SENTRY_ORG` | `ukasz-majerski` |
   | `SENTRY_PROJECT` | `javascript-astro` |

c) Zrób **push** → CI wgra source maps (4.4) i przejdzie też bez sekretów (4.5).

## Uwagi

- **Minimum, żeby „Sentry działało" na prodzie:** punkty 1 i 2 (DSN serwera + klienta). Punkt 3 to tylko ładniejsze stack trace.
- `.dev.vars` ma realny DSN lokalnie — wyczyść, jeśli nie chcesz monitoringu z lokalnego `npm run preview`.
- Znane napięcie (zapisane w `context/foundation/lessons.md`): dev-only trap `/dev/sentry-check` renderuje się tylko w `npm run dev`, a Sentry jest on tylko w prod/preview — live-test wymagał tymczasowego override. Ewentualna poprawka (rozróżnienie preview/production) = osobny change.
- Po domknięciu całości: `/10x-archive sentry-monitoring`.
