# Research: meetings-ui-tokens

## Question

Widok `/meetings` używa wyłącznie hardkodowanych klas kolorów Tailwind. Zbadaj:
1. Gdzie w repozytorium żyje źródło tokenów i jakie tokeny są dostępne.
2. Które klasy w `/meetings/index.astro` mają bezpośredni odpowiednik semantyczny, a które nie.
3. Jakie komponenty współdzielone istnieją lub brakuje ich w `src/components/ui/`.
4. Czy istnieje architektoniczna anomalia w widoku (`N+1` zapytań, brakujące stany).
5. Wniosek: co musi się zmienić w warstwie tokenów **zanim** można zmienić klasy w widoku.

---

## 1. Źródło tokenów

**Plik**: `src/styles/global.css`

Token system jest **w pełni skonfigurowany** przy użyciu Tailwind 4 + shadcn/ui:

- `:root` / `.dark` — wartości CSS (24 zmienne kolorów + `--radius`)
- `@theme inline` — mapuje zmienne na klasy Tailwind (`--color-primary: var(--primary)` → klasa `bg-primary`)
- `@utility bg-cosmic` — globalny gradient tła (używany w `Layout.astro:37`)
- `@layer base` — `bg-background text-foreground` ustawione na `body`

Dostępne klasy semantyczne (subset istotny dla tego widoku):

| Token | Klasa Tailwind 4 | Odpowiada |
|---|---|---|
| `--primary` / `--primary-foreground` | `bg-primary` / `text-primary-foreground` | główna akcja, CTA |
| `--muted` / `--muted-foreground` | `bg-muted` / `text-muted-foreground` | tekst pomocniczy, subtelne tła |
| `--card` / `--card-foreground` | `bg-card` / `text-card-foreground` | tło kart |
| `--border` | `border-border` | obramowania |
| `--background` / `--foreground` | `bg-background` / `text-foreground` | strony, tekst główny |
| `--destructive` | `bg-destructive` / `text-destructive` | błędy |
| `--radius-lg` / `--radius-xl` | `rounded-lg` / `rounded-xl` (via CSS var) | zaokrąglenia |

### Krytyczna anomalia tokenów

`--primary` w `.dark` to `oklch(0.922 0 0)` — **niemal biały szary**, NIE fioletowy.
Tymczasem **cała aplikacja** używa fioletu jako koloru wiodącego: `bg-purple-600`, `text-purple-300`, `hover:bg-purple-500`.

**Wniosek**: wartości `:root` / `.dark` nigdy nie zostały dostosowane do palety PawMeet — są to domyślne wartości grayscale z szablonu shadcn. Migracja widoku do `bg-primary` bez wcześniejszej aktualizacji wartości `--primary` zastąpiłaby fiolet szarością — zmiana byłaby błędna.

**Faza 1 musi zaktualizować wartości tokenów w `:root` i `.dark` na fioletową paletę PawMeet, dopiero potem Faza 2 migruje widok.**

---

## 2. Audyt widoku: `/meetings/index.astro`

### Charge List

#### C1 — Missing tokens: `--primary` nie reprezentuje koloru wiodącego aplikacji
- **Plik:linia**: `src/styles/global.css:14` (`:root --primary`) i `:41` (`.dark --primary`)
- **Efekt na użytkownika**: Żaden przycisk/link/badge nie może użyć `text-primary` zamiast `text-purple-*` — token nie odpowiada projektowi. Zmiana koloru w jednym miejscu nie propaguje się globalnie.
- **Fix**: Zaktualizować `--primary` i powiązane tokeny w `:root` / `.dark` na wartości oklch odpowiadające `purple-600` / `purple-300`.

#### C2 — Missing tokens: nagłówek z gradientem (line 39)
- **Plik:linia**: `src/pages/meetings/index.astro:39`
- **Klasy**: `bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent`
- **Efekt**: Gradient tytułowy jest hardkodowany w każdym widoku oddzielnie (powtarza się też w `/invitations`, `/dogs`). Zmiana palety nie propaguje się.
- **Fix**: Dodać `@utility text-brand-gradient` do `global.css` wyrażony przez `--primary` i `--secondary`, lub uprościć do `text-foreground`.

#### C3 — Missing tokens: kolor linku `text-purple-300`
- **Plik:linia**: `src/pages/meetings/index.astro:47`
- **Klasy**: `text-purple-300 hover:underline`
- **Efekt**: Link używa konkretnego odcienia fioletu; po zmianie palety link nie zmieni się automatycznie.
- **Fix**: Po aktualizacji C1 → `text-primary hover:underline`.

#### C4 — Missing tokens: obramowanie karty `border-white/10`
- **Plik:linia**: `src/pages/meetings/index.astro:45` i `:60`
- **Klasy**: `border border-white/10`
- **Efekt**: W ciemnym motywie token `--border` wynosi `oklch(1 0 0 / 10%)` = **dokładnie** `white/10%`. To idealne dopasowanie — ale token nie jest użyty.
- **Fix**: `border-border` (bez zmiany wyglądu; zysk semantyczny — dark mode automatyczny).

#### C5 — Missing tokens: tekst pomocniczy `text-blue-100/60`
- **Plik:linia**: `src/pages/meetings/index.astro:65`
- **Klasy**: `text-blue-100/60`
- **Efekt**: Data spotkania wyświetlona niebiesko-szarym tekstem. `text-muted-foreground` to `oklch(0.708 0 0)` — neutralna szarość, wizualnie zbliżona. Utrata odcienia niebieskiego, ale semantycznie poprawna.
- **Fix**: `text-muted-foreground`.

#### C6 — Missing tokens: badge `bg-purple-600/60 text-purple-100`
- **Plik:linia**: `src/pages/meetings/index.astro:63`
- **Klasy**: `bg-purple-600/60 text-purple-100`
- **Efekt**: Badge typu spotkania ("Walk"/"Breeding") jest hardkodowany na fiolet.
- **Fix**: Po aktualizacji C1 → `bg-primary/60 text-primary-foreground`.

#### C7 — Missing tokens: kolor `text-white` w nagłówku karty
- **Plik:linia**: `src/pages/meetings/index.astro:62`
- **Klasy**: `text-white`
- **Efekt**: Imię counterparty hardkodowane na biały. W jasnym motywie byłoby niewidoczne.
- **Fix**: `text-card-foreground` lub `text-foreground`.

#### C8 — Missing shared component: brak `Card`
- **Plik:linia**: `src/pages/meetings/index.astro:60`
- **Duplikat**: `rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl` pojawia się dosłownie w każdym widoku (`/invitations`, `/owners`, `/dogs`, `/meetings`).
- **Efekt**: Zmiana wyglądu karty wymaga edycji każdego widoku osobno. Agent zbudował ten styl feature by feature.
- **Fix**: Zainstalować `npx shadcn@latest add card` i dostosować styl, lub wydzielić lokalny komponent `MeetingCard.astro`.
- **Uwaga**: `bg-white/10 backdrop-blur-xl` to glassmorphism — token `bg-card` jest solidny, nie szklany. Kompromis do decyzji w planowaniu.

#### C9 — Missing shared component: brak `Badge`
- **Plik:linia**: `src/pages/meetings/index.astro:63`
- **Efekt**: Badge typu zbudowany z surowego `<span>` z hardkodowanymi klasami. Brak spójności z potencjalnym komponentem Badge w `/invitations`.
- **Fix**: `npx shadcn@latest add badge`.

#### C10 — Accidental architecture: N+1 zapytań do profili
- **Plik:linia**: `src/pages/meetings/index.astro:26–31`
- **Kod**: `Promise.all(counterpartyIds.map(id => getProfile(supabase, id)))`
- **Efekt**: N równoległych zapytań SELECT zamiast jednego SELECT … IN. Ten sam błąd istniał w `/invitations` i został już naprawiony (F3 w impl-review `walk-invitation-loop`) — funkcja `listProfilesByIds` istnieje w `src/lib/services/profile.ts:154`.
- **Fix**: Zastąpić `Promise.all` + `getProfile` wywołaniem `listProfilesByIds(supabase, Array.from(counterpartyIds))` — identyczny pattern jak w `src/pages/invitations/index.astro:26`.

---

## 3. Stan `src/components/ui/`

| Plik | Typ | Używa tokenów semantycznych? |
|---|---|---|
| `button.tsx` | shadcn/ui (CVA) | ✅ Tak — `bg-primary`, `text-primary-foreground`, `bg-destructive` itp. |
| `LibBadge.astro` | Własny (nie-shadcn) | ❌ Nie — `bg-blue-900/50`, `bg-purple-500/30` |

Brakujące komponenty istotne dla `/meetings`:
- `card` — nie zainstalowany
- `badge` — nie zainstalowany

---

## 4. Podsumowanie: co wymaga uwagi przed migracją widoku

| # | Co | Zakres |
|---|---|---|
| **C1** | Zaktualizować `--primary` / `--primary-foreground` w `:root` i `.dark` na wartości oklch fioletu | `src/styles/global.css` |
| **C2** | Dodać `@utility text-brand-gradient` lub uprościć nagłówek | `src/styles/global.css` |
| **C3–C7** | Zamienić hardkodowane klasy na tokeny semantyczne | `src/pages/meetings/index.astro` |
| **C8** | Decyzja: `shadcn card` (solidne tło) vs lokalny komponent glassmorphism | `src/components/ui/` lub lokalne |
| **C9** | Dodać `shadcn badge` | `src/components/ui/` |
| **C10** | Zastąpić N+1 przez `listProfilesByIds` | `src/pages/meetings/index.astro` |

**Odroczone (poza zakresem tego change):**
- Migracja tokenów w pozostałych widokach (`/invitations`, `/owners`, `/dogs`, `Topbar`, formularze).
- `LibBadge.astro` — hardkodowane kolory; do poprawki w osobnym change.
- `--sidebar-*` tokeny — nieużywane w obecnym projekcie.

---

## Źródła

- `src/styles/global.css` — token source (inspected full)
- `src/pages/meetings/index.astro` — target view (inspected full)
- `src/components/ui/button.tsx` — jedyny shadcn komponent (inspected)
- `src/layouts/Layout.astro` — global wrapper (inspected)
- `src/lib/services/profile.ts:154` — `listProfilesByIds` (confirmed exists, F3 fix)
- `context/changes/walk-invitation-loop/reviews/impl-review.md` — F3 finding (listProfilesByIds)
- `../research.md` (root) — poprzedni audyt klasy w całym projekcie
