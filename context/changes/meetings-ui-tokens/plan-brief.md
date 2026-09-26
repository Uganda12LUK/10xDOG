# Plan Brief: meetings-ui-tokens

**Goal**: Semantic tokens instead of hardcoded colors in `/meetings`.

**Phases**: 2 | **Complexity**: LOW

---

## Phase 1 — Kalibracja --primary w global.css

**File**: `src/styles/global.css`

**Co**: Zmienić `--primary` z szarości (shadcn default) na fiolet PawMeet w obu blokach `:root` i `.dark`.

```css
/* :root */
--primary: oklch(0.558 0.288 301);    /* było: oklch(0.205 0 0) */

/* .dark */
--primary: oklch(0.558 0.288 301);    /* było: oklch(0.922 0 0) */
--primary-foreground: oklch(1 0 0);   /* było: oklch(0.205 0 0) */
```

**Weryfikacja**: `Button` w `/owners/[id]` staje się fioletowy.

---

## Phase 2 — Migracja /meetings/index.astro + N+1 fix

**File**: `src/pages/meetings/index.astro`

**Co** (7 zmian klas + N+1):

| Linia | Stara klasa | Nowa klasa |
|---|---|---|
| `bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent` | — | `text-primary` |
| `border-white/10` (×2) | — | `border-border` |
| `text-purple-300` | — | `text-primary` |
| `text-white` | — | `text-primary` |
| `bg-purple-600/60 text-purple-100` | — | `bg-primary/60 text-primary-foreground` |
| `text-blue-100/60` | — | `text-muted-foreground` |

**N+1**: `Promise.all(getProfile×N)` → `listProfilesByIds(supabase, ids)` (pattern z `/invitations/index.astro:26`).
