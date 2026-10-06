<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Design system — Koralowa smycz (coral leash) token palette

- **Plan**: context/changes/ui-tokens-coral/plan.md
- **Scope**: Full plan (Phase 1)
- **Reviewed phases**: 1
- **Date**: 2026-09-26
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 2 observations

## Visual Gate

Screenshots captured:

- `context/changes/ui-tokens-coral/screenshot-desktop.png` — 1280×800, token kitchen sink
- `context/changes/ui-tokens-coral/screenshot-mobile.png` — 390×844

Tokens verified visually:
- ✅ `bg-primary` — terra-cotta coral (#C4461F) na przycisku, biały tekst czytelny
- ✅ `bg-accent` — jasny koral (#FBEDE7) na badge Walk/Breeding
- ✅ `text-muted-foreground` — stone-gray (#78716C), czytelny
- ✅ `bg-background` — ciepły kamień (#FAF8F5), nie pure white
- ✅ `--destructive`, `--success`, `--warning` — semantycznie rozróżnialne
- ✅ Plan drift: wszystkie 16 zaplanowanych zmian w global.css to MATCH

## Automated Verification

- ✅ npm run lint — passes (exit 0)
- ✅ npm run build — passes ("Complete!")

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — `bg-cosmic` w Layout.astro: klasa bez definicji w nowym CSS

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/layouts/Layout.astro:37`
- **Detail**: `<div class="bg-cosmic min-h-screen">` — `bg-cosmic` nie istnieje nigdzie w `global.css` ani jako Tailwind utility. W Tailwind v4 nieznana klasa `bg-*` generuje zero CSS; tło pochodzi z `body { @apply bg-background }` (#FAF8F5) — działa poprawnie, ale przypadkowo. Klasa jest dead code z poprzedniego dark theme. Zmiana `ui-tokens-coral` nie objęła `Layout.astro` (CSS-only scope), ale nowy design system ujawnił ten problem.
- **Fix**: Zamień `bg-cosmic` na `bg-background` w `src/layouts/Layout.astro:37`.
- **Decision**: FIXED — `bg-cosmic` → `bg-background` w `src/layouts/Layout.astro:37`

### F2 — Kontrast --primary na --background na granicy WCAG AA

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/styles/global.css`
- **Detail**: Trzy pary kontrastowe są blisko dolnej granicy WCAG AA (4.5:1):
  - `text-primary (#C4461F) na bg-background (#FAF8F5)`: **4.67:1** — przechodzi AA, nie przechodzi AAA
  - `text-primary-foreground (#FFFFFF) na bg-primary (#C4461F)` (przycisk): **4.95:1** — przechodzi AA
  - `text-muted-foreground (#78716C) na bg-background (#FAF8F5)`: **4.53:1** — ledwo przechodzi AA
  Wszystkie pary spełniają minimum; żadna nie jest broken. Przy bardzo małym tekście lub non-retina rendering mogą być graniczne.
- **Fix**: Opcjonalnie rozjaśnić `--primary` do `#BE3E17` lub przyciemnić `--muted-foreground` do `#6D6560` aby dać więcej marginesu. Nie blokuje releasu.
- **Decision**: SKIP — wszystkie pary przechodzą WCAG AA; nie wymaga akcji.
