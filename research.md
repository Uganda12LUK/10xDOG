# Style & UI Component Audit — PawMeet

> Read-only research. No project files were modified.
> Date: 2026-09-26

---

## 1. Główny plik stylów i zmienne CSS

**Ścieżka**: `src/styles/global.css`

### Zmienne zdefiniowane w `:root`

| Zmienna | Wartość |
|---|---|
| `--radius` | `0.625rem` |
| `--background` | `oklch(1 0 0)` |
| `--foreground` | `oklch(0.145 0 0)` |
| `--card` | `oklch(1 0 0)` |
| `--card-foreground` | `oklch(0.145 0 0)` |
| `--popover` | `oklch(1 0 0)` |
| `--popover-foreground` | `oklch(0.145 0 0)` |
| `--primary` | `oklch(0.205 0 0)` |
| `--primary-foreground` | `oklch(0.985 0 0)` |
| `--secondary` | `oklch(0.97 0 0)` |
| `--secondary-foreground` | `oklch(0.205 0 0)` |
| `--muted` | `oklch(0.97 0 0)` |
| `--muted-foreground` | `oklch(0.556 0 0)` |
| `--accent` | `oklch(0.97 0 0)` |
| `--accent-foreground` | `oklch(0.205 0 0)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` |
| `--border` | `oklch(0.922 0 0)` |
| `--input` | `oklch(0.922 0 0)` |
| `--ring` | `oklch(0.708 0 0)` |
| `--chart-1` … `--chart-5` | (5 wartości oklch) |
| `--sidebar` | `oklch(0.985 0 0)` |
| `--sidebar-foreground` | `oklch(0.145 0 0)` |
| `--sidebar-primary` | `oklch(0.205 0 0)` |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` |
| `--sidebar-accent` | `oklch(0.97 0 0)` |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` |
| `--sidebar-border` | `oklch(0.922 0 0)` |
| `--sidebar-ring` | `oklch(0.708 0 0)` |

### Zmienne zdefiniowane w `.dark`

Nadpisane: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1` … `--chart-5`, `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`.

**Uwaga**: `--radius` nie ma odpowiednika w `.dark` — to poprawne (jest neutralna względem motywu).

---

## 2. Zmienne publikowane w `@theme inline`

Blok `@theme inline` mapuje zmienne CSS na tokeny Tailwind 4. Pełna lista:

```
--radius-sm   --radius-md   --radius-lg   --radius-xl

--color-background            --color-foreground
--color-card                  --color-card-foreground
--color-popover               --color-popover-foreground
--color-primary               --color-primary-foreground
--color-secondary             --color-secondary-foreground
--color-muted                 --color-muted-foreground
--color-accent                --color-accent-foreground
--color-destructive
--color-border                --color-input              --color-ring
--color-chart-1 … --color-chart-5
--color-sidebar               --color-sidebar-foreground
--color-sidebar-primary       --color-sidebar-primary-foreground
--color-sidebar-accent        --color-sidebar-accent-foreground
--color-sidebar-border        --color-sidebar-ring
```

Oznacza to, że klasy takie jak `bg-primary`, `text-muted-foreground`, `border-border`, `bg-destructive` itp. są **w pełni gotowe do użycia** jako klasy semantyczne Tailwind 4.

Zdefiniowany jest też niestandardowy utility `@utility bg-cosmic` (gradient tła).

---

## 3. Komponenty fizycznie obecne w `src/components/ui/`

| Plik | Typ |
|---|---|
| `src/components/ui/button.tsx` | React (shadcn/ui, CVA, `@radix-ui/react-slot`) |
| `src/components/ui/LibBadge.astro` | Astro (badge biblioteki — nie shadcn) |

**Łącznie: 2 pliki.** Jest to bardzo mały zestaw — brakuje wielu standardowych prymitywów shadcn (patrz punkt 5).

---

## 4. Pliki używające twardo zakodowanych klas kolorów

Poniżej zestawienie wszystkich plików `src/`, które używają klas kolorów Tailwind (`bg-purple-*`, `text-blue-*` itd.) zamiast semantycznych tokenów (`bg-primary`, `text-muted-foreground`).

### `src/components/Welcome.astro`
- `bg-purple-500/20`, `bg-blue-500/15`, `bg-indigo-400/10` — dekoracyjne rozmyte blobs (tło)
- `bg-purple-600`, `hover:bg-purple-500` — przycisk CTA
- `text-purple-300` — ikony sekcji
- `text-blue-100/70`, `text-blue-100/60` — teksty akapitów

### `src/components/Topbar.astro`
- `text-purple-300`, `hover:text-purple-100` — wszystkie linki nawigacyjne
- `text-blue-100/70` — email użytkownika

### `src/components/auth/FormField.tsx`
- `text-blue-100/80` — etykiety pól
- `text-red-300` — komunikaty błędów

### `src/components/auth/ServerError.tsx`
- `border-red-500/30 bg-red-900/30 text-red-300` — baner błędu serwera

### `src/components/auth/SignUpForm.tsx`
- `text-blue-100/50` — hint pod hasłem

### `src/components/auth/SubmitButton.tsx`
- `bg-purple-600`, `hover:bg-purple-500` — przycisk submit formularzy auth

### `src/components/profile/ProfileForm.tsx`
- `border-blue-400/30 bg-blue-900/30 text-blue-200` — baner info
- `text-blue-100/80` — etykiety
- `file:bg-purple-600`, `hover:file:bg-purple-500` — file input
- `text-green-300` — komunikat sukcesu

### `src/components/dogs/DogForm.tsx`
- `text-blue-100/80` — etykiety
- `file:bg-purple-600`, `hover:file:bg-purple-500` — file input

### `src/components/ui/LibBadge.astro`
- `bg-blue-900/50 text-blue-200` — tło badge'a
- `bg-purple-500/30 text-purple-200` — badge wersji

### `src/pages/dashboard.astro`
- `text-blue-100/80`, `text-blue-100/50`

### `src/pages/profile.astro`
- `text-purple-300`, `hover:text-purple-100`

### `src/pages/auth/signin.astro` i `signup.astro`
- `text-blue-100/60`, `text-purple-300`

### `src/pages/auth/confirm-email.astro`
- `text-blue-100/80`, `text-purple-300`

### `src/pages/dogs/index.astro`
- `bg-purple-600`, `hover:bg-purple-500` — przycisk "Add dog"
- `border-red-500/30 bg-red-900/30 text-red-300` — błąd
- `border-green-500/30 bg-green-900/30 text-green-300` — sukces
- `border-white/10 bg-white/10 text-blue-100/80` — empty state
- `text-blue-100/70`, `text-blue-100/60` — metadata psów

### `src/pages/dogs/[id].astro`
- `text-red-300`, `hover:text-red-200` — przycisk delete
- `text-blue-100/70`, `text-purple-300`

### `src/pages/owners/index.astro`
- `border-white/10 bg-white/10 text-blue-100/80` — empty state
- `border-blue-500/30 bg-blue-900/30 text-blue-200` — baner info
- `text-purple-300`, `text-blue-100/70`, `text-blue-100/60`

### `src/pages/owners/[id].astro`
- `text-blue-100/80`, `text-blue-100/70`, `text-blue-100/60`
- `text-purple-300`, `hover:text-purple-100`
- `border-green-500/30 bg-green-900/30 text-green-200` — sukces
- `border-red-500/30 bg-red-900/30 text-red-200` — błąd
- `bg-purple-600/50 text-white/50` — wyłączony przycisk

### `src/pages/invitations/index.astro`
- `border-green-500/30 bg-green-900/30 text-green-200`
- `border-red-500/30 bg-red-900/30 text-red-200`
- `border-white/10 bg-white/10 text-blue-100/80` — empty state
- `text-purple-300`, `text-blue-100/60`, `text-blue-100/80`
- `bg-green-600/80 hover:bg-green-500` — Accept
- `bg-red-600/60 hover:bg-red-500` — Decline

### `src/pages/meetings/index.astro`
- `border-white/10 bg-white/10 text-blue-100/80` — empty state
- `text-purple-300`
- `bg-purple-600/60 text-purple-100` — badge typu
- `text-blue-100/60` — data spotkania

**Podsumowanie**: Niemal 100% plików widokowych używa twardo zakodowanych kolorów zamiast tokenów semantycznych. Projekt nie korzysta z systemu `bg-primary`, `text-muted-foreground` itp. poza komponentem `button.tsx` (shadcn).

---

## 5. Brakujące prymitywy UI (dla docelowych widoków danych)

Aktualnie w `src/components/ui/` istnieje tylko `button.tsx` i `LibBadge.astro`. Brakujące komponenty shadcn/ui niezbędne do poprawnego wyświetlania widoków danych:

| Komponent | Widoki, które go potrzebują | Instalacja |
|---|---|---|
| `card` | `/meetings`, `/invitations`, `/owners`, `/dogs` — karty list i profili | `npx shadcn@latest add card` |
| `badge` | `/meetings` (typ spotkania), `/invitations` (status) | `npx shadcn@latest add badge` |
| `avatar` | `/owners`, `/owners/[id]`, `/meetings` — zdjęcia profili i psów | `npx shadcn@latest add avatar` |
| `separator` | sekcje "Incoming"/"Outgoing" w `/invitations`, sekcje profilu | `npx shadcn@latest add separator` |
| `alert` / `alert-destructive` | banery błędów i sukcesu (aktualnie r  ęczne `div` z `bg-red-900/30`) | `npx shadcn@latest add alert` |
| `input` | formularze (FormField, DogForm, ProfileForm) — aktualnie surowy `<input>` | `npx shadcn@latest add input` |
| `label` | etykiety form (powiązane z Input) | `npx shadcn@latest add label` |
| `skeleton` | stany ładowania kart właścicieli / psów | `npx shadcn@latest add skeleton` |

**Uwaga dot. `badge`**: Istniejący `LibBadge.astro` to komponent wewnętrzny (nie shadcn), z hardkodowanymi kolorami `blue-900` i `purple-500`. Dla semantycznego badge'a statusu potrzebny jest `npx shadcn@latest add badge`.
