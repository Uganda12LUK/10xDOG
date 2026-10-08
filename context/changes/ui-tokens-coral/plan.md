# UI Tokens Coral — Retroactive Implementation Plan

## Overview

Wymiana całej palety tokenów design systemu z amber-oklch (shadcn defaults skalibrowane w meetings-ui-tokens) na „Koralową smycz" — PawMeet-branded, hex-based, light-mode-first system. Zmiana globalna: jeden plik CSS, zero zmian w komponentach.

## Current State Analysis (pre-change)

- `src/styles/global.css` — amber oklch defaults ze shadcn, skalibrowane w meetings-ui-tokens p2:
  - `--primary: oklch(0.75 0.18 65)` (amber, dark foreground)
  - `--background: oklch(1 0 0)` (pure white)
  - `--accent: oklch(0.97 0 0)` (near-white, nondescript)
  - Brak tokenów `--success`, `--warning`, `--destructive-foreground`
  - Brak `--radius` skalibrowanego na morkę aplikacji
  - Brak komentarzy o roli kolorów marki

## Desired End State

- `--primary: #C4461F` — koral terra-cotta PawMeet; `--primary-foreground: #FFFFFF`
- `--background: #FAF8F5` — ciepły kamień, nie pure white
- `--accent: #FBEDE7` — delikatny koral do chipów i hover
- `--accent-foreground: #7A2A12` — ciemny koral do tekstu na accentach
- `--success`, `--warning`, `--destructive` z pełnymi foreground parami
- `--radius: 0.75rem` (zaokrąglenia PawMeet)
- Kompletny `.dark` wariant z jaśniejszym koralem (`#E8663D`)
- Komentarze wyjaśniające role kolorów marki

## What We're NOT Doing

- Zmiany w komponentach React/Astro — tokeny zmieniamy, class names zostają
- Instalacja nowych komponentów shadcn
- Aktywacja dark mode w layout (`.dark` na `<html>` — osobna decyzja)
- Migracja `button.tsx:14` — `text-white` na destructive variant jest intentional

## Implementation

Retroaktywna — zmiana wylądowała jako commit `d66e046` wyodrębniony z working tree podczas triage impl-review change `meetings-ui-tokens` (F4, 2026-09-26).

### Plik: `src/styles/global.css`

**Zmiany**:
1. Dodano blok komentarza z rolami koloru marki
2. `--radius`: `0.625rem` → `0.75rem`
3. `--background`: pure white → `#FAF8F5` (ciepły kamień)
4. `--foreground`: oklch → `#1C1917` (bardzo ciemny brąz)
5. `--card`, `--popover`: oklch → `#FFFFFF` z matching foreground
6. `--primary`: amber oklch → `#C4461F` (koral), foreground white
7. `--secondary`, `--muted`: near-white oklch → `#F2EFEB` (stone-100)
8. `--accent`: nondescript near-white → `#FBEDE7` (jasny koral)
9. `--accent-foreground`: near-black → `#7A2A12` (ciemny koral)
10. `--destructive`: oklch → `#9F1239` (malinowy), + `--destructive-foreground: #FFFFFF`
11. Nowe: `--success: #2E7D4F` / `--warning: #A16207` z foreground
12. `--border`, `--input`: oklch szarość → `#E7E5E4` (stone-200)
13. `--ring`: neutral → `#C4461F` (koral)
14. `--chart-*`: remapped do spójnej palety
15. `--sidebar-*`: nowe wartości dopasowane do motywu
16. `.dark` wariant: `#171412` background, `#E8663D` primary (jasny koral na ciemnym tle)

## Success Criteria

### Automated Verification

- [ ] npm run lint passes
- [ ] npm run build passes

### Manual Verification

- [ ] `bg-primary` na przycisku w `/owners/[id]` renderuje się koralem (#C4461F light, #E8663D dark)
- [ ] `bg-card` na kartach widać jako biały (#FFFFFF) — nie amber ani oklch
- [ ] `bg-accent` na badge "Walk"/"Breeding" w /meetings renderuje się jako jasny koral (#FBEDE7)
- [ ] `text-muted-foreground` to czytelny stone-gray (#78716C), nie czarny
- [ ] `bg-background` strony to ciepły kamień (#FAF8F5), nie pure white
- [ ] Screenshoty: desktop + mobile dla `/meetings` (wszystkie stany)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Wymiana palety tokenów w global.css

#### Automated

- [x] 1.1 npm run lint passes — d66e046
- [x] 1.2 npm run build passes — d66e046

#### Manual

- [x] 1.3 bg-primary renderuje koral — d66e046 (zweryfikowane przez screenshot kitchen-sink /meetings)
- [x] 1.4 bg-card = white, bg-accent = jasny koral, text-muted czytelny — d66e046
- [x] 1.5 Screenshoty desktop + mobile — context/changes/meetings-ui-tokens/screenshot-desktop.png, screenshot-mobile.png
