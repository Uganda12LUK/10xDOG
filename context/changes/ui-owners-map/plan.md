# ui-owners-map Implementation Plan

## Overview

Przebudowa `src/pages/owners/index.astro` na mobilny ekran mapy psów w okolicy: mapa Leaflet z pinezkami właścicieli, chipy filtrowania rasy, arkusz danych psa wysuwany od dołu po kliknięciu pinezki.

## Current State Analysis

- `src/pages/owners/index.astro` — działa jako lista; pobiera `OwnerWithDogs[]` przez `listOwners`, filtruje po mieście/dzielnicy. Dane te zostaną **zachowane** — tylko widok się zmienia.
- `src/types.ts` — `Dog` nie ma pól `sex` ani `lat/lng`; dostępna jest jedynie `breed`. `Profile` nie ma współrzędnych.
- `src/lib/age.ts` — `ageStringFromBirthdate` gotowe po `ui-start-screen`.
- `src/components/ui/` — `button.tsx` jest; `sheet.tsx` **brak** — do doinstalowania.
- `leaflet`, `react-leaflet`, `@types/leaflet` — **brak** w `package.json`.
- BottomNav zajmuje 70px na dole; Layout.astro dodaje `pb-[70px]` gdy zalogowany.

## Desired End State

Po ukończeniu zalogowany użytkownik widzi:
- chipy filtrowania u góry (`Wszystkie`, dynamiczne rasy, `Wiek`/`Płeć`/`Charakter` jako disabled + "Wkrótce")
- mapę OSM zajmującą `h-[calc(100dvh-200px)]` z pinezkami właścicieli (demo-offset od `profile.id`)
- klik w pinezkę → shadcn Sheet wysuwa się od dołu z psami właściciela (foto, imię, rasa, wiek, CTA „Zaproponuj spacer" → `/owners/{id}`)
- przewijalną listę kart właścicieli poniżej mapy
- aktualną lokalizację jako centrum mapy (fallback: centrum polskiego miasta z profilu)

### Key Discoveries

- Brak `sex` i `lat/lng` w modelu — chip „Płeć" = disabled „Wkrótce"; współrzędne = demo-offset
- Filtrowanie client-side po `dog.breed` (pole dostępne w każdym `Dog`)
- Wszystkie 4 nowe pliki to React (`client:only="react"` dla całości) — żaden nie trafia do SSR
- Istniejący SSR fetch (city-based `listOwners`) **zostaje bez zmian** — tylko przekazujemy dane jako props

## What We're NOT Doing

- Prawdziwe GPS (brak kolumn w bazie) — demo-offset jest jawnie przybliżony
- Serwerowe filtrowanie — client-side na załadowanych danych
- Zaawansowane chipy (Wiek, Płeć, Charakter) — disabled + "Wkrótce"
- Nowe trasy API ani migracje
- Drag-and-drop pinezki (to formularz spotkania — osobny slice)

## Implementation Approach

Trzy fazy: najpierw zależności npm i shadcn (Phase 1), potem 4 komponenty React (Phase 2), potem przebudowa strony Astro (Phase 3). Cały interaktywny widok to jeden React island (`OwnersMapView`, `client:only="react"`), który jako props otrzymuje dane z SSR.

---

## Phase 1: Dependencies

### Overview

Instalacja `leaflet`, `react-leaflet`, `@types/leaflet` oraz shadcn `sheet`.

### Changes Required

#### 1. Instalacja npm

**Intent**: dodaj brakujące pakiety do `package.json`. Leaflet CSS będzie importowany wewnątrz komponentu React.

```
npm install leaflet react-leaflet @types/leaflet
npx shadcn@latest add sheet
```

### Success Criteria

#### Automated Verification

- 1.1 `npm run build` — kompiluje bez błędów (leaflet typy dostępne)
- 1.2 `ls src/components/ui/sheet.tsx` istnieje

#### Manual Verification

- 1.3 `package.json` zawiera `"leaflet"`, `"react-leaflet"`, `"@types/leaflet"`

---

## Phase 2: Map Components

### Overview

4 komponenty React w `src/components/map/`: `FilterChips.tsx`, `DogMap.tsx`, `BottomSheet.tsx`, `OwnersMapView.tsx` (rodzic zarządzający stanem).

### Changes Required

#### 1. src/components/map/FilterChips.tsx

**Intent**: Poziomy scroll chipów filtrowania. „Wszystkie" + unikalne rasy z załadowanych danych. Pozostałe chipy (Wiek, Płeć, Charakter) są `disabled` z adnotacją „Wkrótce".

**Contract**:
```ts
interface Props {
  breeds: string[];          // unikalne rasy z OwnerWithDogs[]
  selectedBreed: string | null;
  onBreedChange: (breed: string | null) => void;
}
```

Layout: `flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide`. Aktywny chip: `bg-primary text-primary-foreground`. Disabled chips: `opacity-50 cursor-default`.

#### 2. src/components/map/DogMap.tsx

**Intent**: React-Leaflet mapa OSM z pinezkami właścicieli. Import Leaflet CSS wewnątrz pliku. Centrum mapy pochodzi z geolokalizacji lub tabeli miast. Demo-offset od `profile.id`.

**Contract**:
```ts
interface Props {
  owners: OwnerWithDogs[];
  center: [number, number];
  onOwnerSelect: (owner: OwnerWithDogs) => void;
}
```

Demo-offset (deterministyczny z `profile.id`):
```ts
function deterministicOffset(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h * 31) + id.charCodeAt(i)) >>> 0;
  return [((h % 1001) - 500) / 100000, (((h >> 4) % 1001) - 500) / 100000];
}
```

Mapa: `MapContainer`, `TileLayer` (OSM), `Marker` z `DivIcon` (inicjały właściciela w kółku 36×36, `bg-primary`). Click na marker → `onOwnerSelect(owner)`.

Geolokalizacja w `useEffect` z callbackiem na sukces/błąd. Brak geolokalizacji → centrum z tabeli:
```ts
const CITY_CENTERS: Record<string, [number, number]> = {
  Warszawa: [52.2297, 21.0122], Kraków: [50.0647, 19.945],
  Wrocław: [51.1079, 17.0385], Poznań: [52.4064, 16.9252],
  Gdańsk: [54.352, 18.6466], Łódź: [51.7592, 19.456],
  Katowice: [50.2649, 19.0238], Lublin: [51.2465, 22.5684],
  Białystok: [53.1325, 23.1688], Szczecin: [53.4285, 14.5528],
};
```

`height: "100%"` + rodzic `h-[calc(100dvh-200px)]`.

#### 3. src/components/map/BottomSheet.tsx

**Intent**: shadcn `Sheet` (side="bottom") z danymi psów wybranego właściciela. Foto psa, imię, rasa, wiek, CTA „Zaproponuj spacer" → `/owners/{profile.id}`.

**Contract**:
```ts
interface Props {
  owner: OwnerWithDogs | null;
  open: boolean;
  onClose: () => void;
}
```

Render: lista psów właściciela (poziomy scroll), każdy pies: zdjęcie `aspect-square w-16` lub emoji-placeholder, imię + rasa + wiek. Sticky footer: `<Button asChild><a href={...}>Zaproponuj spacer</a></Button>`.

#### 4. src/components/map/OwnersMapView.tsx

**Intent**: Rodzic zarządzający stanem. Geolokalizacja inicjalizuje `center`. Filtruje `owners` po `selectedBreed`. Renderuje FilterChips → DogMap → BottomSheet → lista kart.

**Contract**:
```ts
interface Props {
  owners: OwnerWithDogs[];
  city: string;
}
```

Stan: `center: [number, number]` (inicjowany z `CITY_CENTERS[city] ?? [52.2297, 21.0122]`), `selectedOwner: OwnerWithDogs | null`, `selectedBreed: string | null`.

`useEffect` → geolokalizacja → aktualizuj `center`.

Filtrowanie:
```ts
const filtered = selectedBreed
  ? owners.filter(o => o.dogs.some(d => d.breed === selectedBreed))
  : owners;
const breeds = [...new Set(owners.flatMap(o => o.dogs.map(d => d.breed)))].sort();
```

Layout:
```
<div class="relative">
  <FilterChips ... />
  <div class="h-[calc(100dvh-200px)]">
    <DogMap owners={filtered} center={center} onOwnerSelect={setSelectedOwner} />
  </div>
  <div class="divide-y divide-border"> {/* lista kart */}
    {filtered.map(owner => <OwnerCard owner={owner} onClick={setSelectedOwner} />)}
  </div>
  <BottomSheet owner={selectedOwner} open={!!selectedOwner} onClose={() => setSelectedOwner(null)} />
</div>
```

`OwnerCard` (inline w tym pliku, nie osobny plik): awatar + imię + imiona psów + `card-interactive`.

### Success Criteria

#### Automated Verification

- 2.1 `npm run lint` — 0 błędów/ostrzeżeń
- 2.2 `npm run build` — brak błędów TypeScript

#### Manual Verification

- 2.3 Komponenty importują się bez błędów runtime w `npm run dev`

---

## Phase 3: Page Rebuild

### Overview

Przebudowa `src/pages/owners/index.astro`: zachowanie SSR fetch, uproszczenie szablonu, podłączenie `OwnersMapView` jako `client:only="react"`.

### Changes Required

#### 1. src/pages/owners/index.astro — pełna przebudowa

**File**: `src/pages/owners/index.astro`

**Intent**: Zachować cały istniejący frontmatter (supabase, listOwners, city logic). Zastąpić stary HTML Layout renderujący `<OwnersMapView>` z danymi jako props. Gdy brak miasta w profilu — zachować istniejący fallback "Set your city in Profile".

**Contract**: Layout title zmieniony na `"Mapa spacerów"`. `hasCity` guard bez zmian. Gdy `hasCity`:

```astro
<OwnersMapView owners={owners} city={myCity ?? ""} client:only="react" />
```

Importy w frontmatterze:
```ts
import OwnersMapView from "@/components/map/OwnersMapView";
```

Usunąć: `showingCityWide` banner oraz całą listę `<ul>` — te dane trafiają teraz do React island.

`<Layout title="Mapa spacerów">` bez wewnętrznych wrapperów `max-w-lg px-4` — island sam zarządza layoutem (full-width mapa).

### Success Criteria

#### Automated Verification

- 3.1 `npm run lint` — 0 błędów
- 3.2 `npm run build` — brak błędów TypeScript

#### Manual Verification

- 3.3 @ 390px (zalogowany, ma miasto): mapa widoczna z pinezkami
- 3.4 Chip „Rasa" (np. „Labrador"): filtruje pinezki i listę
- 3.5 Klik na pinezkę → Sheet wysuwa się od dołu z danymi psa
- 3.6 „Zaproponuj spacer" w Sheet → `/owners/{id}`
- 3.7 Chipy Wiek/Płeć/Charakter: disabled, chip „Wkrótce"
- 3.8 Brak miasta w profilu → fallback „Set your city" widoczny

---

## Testing Strategy

1. `npm run dev` → zaloguj → `/owners`
2. Pozwól/odrzuć geolokalizację → upewnij się, że mapa się centruje w obu przypadkach
3. Kliknij pinezkę → Sheet z danymi psa
4. Wybierz chip rasy → mapa i lista odfiltrowane
5. Kliknij „Zaproponuj spacer" → `/owners/{id}` otwiera się
6. Profil bez miasta → fallback zamiast mapy

## References

- Wzorzec supabase + listOwners: `src/pages/owners/index.astro` (istniejący frontmatter)
- OwnerWithDogs, Dog, Profile: `src/types.ts`
- ageStringFromBirthdate: `src/lib/age.ts`
- shadcn Sheet: `src/components/ui/sheet.tsx` (po doinstalowaniu)
- Token source: `src/styles/global.css`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Dependencies

#### Automated

- [x] 1.1 npm run build — 0 błędów — 6e6d905

#### Manual

- [x] 1.2 package.json zawiera leaflet + react-leaflet + @types/leaflet — 6e6d905
- [x] 1.3 src/components/ui/sheet.tsx istnieje — 6e6d905

### Phase 2: Map Components

#### Automated

- [x] 2.1 npm run lint — 0 błędów — 4697813
- [x] 2.2 npm run build — brak błędów TypeScript — 4697813

#### Manual

- [ ] 2.3 Komponenty importują się bez runtime errors

### Phase 3: Page Rebuild

#### Automated

- [x] 3.1 npm run lint — 0 błędów — 4697813
- [x] 3.2 npm run build — brak błędów TypeScript — 4697813

#### Manual

- [ ] 3.3 Mapa z pinezkami widoczna @ 390px
- [ ] 3.4 Filtrowanie rasy działa
- [ ] 3.5 Sheet z danymi psa wysuwa się po kliknięciu pinezki
- [ ] 3.6 CTA „Zaproponuj spacer" → /owners/{id}
- [ ] 3.7 Chipy Wiek/Płeć/Charakter: disabled + „Wkrótce"
- [ ] 3.8 Fallback „Set your city" gdy brak miasta
