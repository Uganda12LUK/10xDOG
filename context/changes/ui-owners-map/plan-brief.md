# ui-owners-map — Plan Brief

> Full plan: `context/changes/ui-owners-map/plan.md`

## What & Why

Przebudowa ekranu `/owners` z listy kart na mobilny widok mapy. Użytkownik musi widzieć psy w okolicy geograficznie — lista bez mapy jest nieczytelna na mobile i nie oddaje sensu "psy w okolicy".

## Starting Point

`owners/index.astro` jest działającą listą z SSR city-filter. Tokeny, BottomNav i layout są gotowe (`ui-tokens-nav` ✓). `ageStringFromBirthdate` gotowe (`ui-start-screen` ✓). Brak: leaflet, react-leaflet, @types/leaflet, shadcn Sheet — do doinstalowania.

## Desired End State

Zalogowany użytkownik z ustawionym miastem widzi mapę OSM z pinezkami właścicieli (demo-offset), chipy filtrowania rasy, arkusz danych psa po kliknięciu pinezki, listę właścicieli poniżej mapy.

## Key Decisions Made

| Decision | Choice | Why (1 zdanie) | Source |
|---|---|---|---|
| Współrzędne | Demo-offset ±0.005° od `profile.id` | Brak `lat/lng` w bazie; deterministyczne = stabilne piny bez GPS | Interview |
| Geo fallback | Tabela centrum polskich miast (10 wpisów) | Proste, bez API, pokrywa główne miasta | Interview |
| Filtrowanie | Client-side po załadowanym `OwnerWithDogs[]` | Brak endpointu filtrowania; dane już w przeglądarce | Interview |
| Aktywne chipy | Tylko „Rasa" (`dog.breed`) | Dog nie ma `sex` ani wiek-jako-chip; pozostałe = „Wkrótce" | Interview |
| Pin action | shadcn Sheet (side="bottom") | Natywne dla mobile, już w planie shadcn stack | Interview |
| Architektura | Jeden island `OwnersMapView client:only` | Geolokalizacja + stan Sheet + filtrowanie → muszą być razem w React | Plan |

## Scope

**In scope:**
- `npm install leaflet react-leaflet @types/leaflet`
- `npx shadcn@latest add sheet`
- `src/components/map/FilterChips.tsx`
- `src/components/map/DogMap.tsx` (import leaflet CSS wewnątrz)
- `src/components/map/BottomSheet.tsx`
- `src/components/map/OwnersMapView.tsx` (parent island)
- `src/pages/owners/index.astro` — uproszczenie + mount islanda

**Out of scope:**
- Prawdziwe GPS w bazie (osobna zmiana/migracja)
- Drag pinezki (formularz spotkania — `ui-meeting-form`)
- Filtr po wieku/płci (brak danych w modelu)
- Nowe API routes ani migracje

## Architecture / Approach

SSR frontmatter pobiera dane bez zmian (city-filter). React island `OwnersMapView` (`client:only="react"`) dostaje `owners: OwnerWithDogs[]` + `city: string` jako props, zarządza całym stanem interaktywnym: centrum mapy, wybrany właściciel, wybrany filtr. Podzielony na 3 child components (FilterChips, DogMap, BottomSheet) + inline OwnerCard.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Deps | leaflet + sheet.tsx w repo | shadcn add może zapytać o konfigurację — odpowiedzieć defaults |
| 2. Components | 4 pliki React w `src/components/map/` | Leaflet CSS import w Vite/Astro — impostowany wewnątrz client:only komponentu |
| 3. Page rebuild | owners/index.astro jako cienki shell | Prop serialization dużej tablicy owners — OK bo Astro obsługuje JSON props |

**Prerequisites:** `ui-tokens-nav` done ✓, `ui-start-screen` done ✓ (ageStringFromBirthdate)

## Open Risks & Assumptions

- Leaflet default marker icons nie działają z Vite (require() issue) — rozwiązane przez użycie DivIcon (inicjały w kółku), brak default icon
- Bardzo dużo właścicieli w jednym mieście → pinezki na mapie mogą się nakładać — akceptowalne w demo
- `navigator.geolocation` może być zablokowane przez przeglądarkę bez komunikatu — obsługiwane przez city fallback

## Success Criteria (Summary)

- Mapa z pinezkami widoczna @ 390px po zalogowaniu z miastem w profilu
- Klik pinezki → Sheet z danymi psa i CTA
- Chip rasy filtruje pinezki i listę poniżej
- `npm run build` bez błędów TypeScript
