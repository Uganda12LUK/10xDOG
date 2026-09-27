# ui-start-screen Implementation Plan

## Overview

Przebudowa `src/pages/dashboard.astro` na mobilny ekran startowy: header z powitaniem, karta pierwszego psa użytkownika (lub CTA „Dodaj psa"), i siatka 6 kafelków szybkich akcji.

## Current State Analysis

- `src/pages/dashboard.astro` — placeholder: email + sign-out button, brak danych psa ani profilu
- `src/lib/services/dog.ts:44` — `listDogs(client, ownerId)` gotowe, zwraca `Dog[]`
- `src/lib/services/profile.ts:53` — `getProfile(client, userId)` gotowe, zwraca `Profile | null` (pole `name` nullable)
- `src/lib/age.ts` — `ageFromBirthdate(birthdate)` zwraca tylko lata (number), brak wariantu z miesiącami
- Tokeny `shadow-card`, `card-interactive`, `rounded-xl`, `text-primary` — gotowe po `ui-tokens-nav`
- `/meetings/new` i `/places` nie istnieją jeszcze jako strony

## Desired End State

Po ukończeniu zmiany zalogowany użytkownik widzi:
- nagłówek „Cześć, {displayName}!" (imię z profilu, lub prefix emaila gdy brak)
- kartę pierwszego psa (zdjęcie, imię, rasa, wiek w formacie „2 l. 3 mies."), klikalną → `/dogs/{id}`
- fallback gdy brak psa: karta CTA „Dodaj pierwszego psa" → `/dogs/new`
- siatkę 3×2 kafelków; kafelki „Zaproponuj spotkanie" i „Miejsca" mają chip „Wkrótce" i są nieklikalne (div)

### Key Discoveries:

- `src/lib/age.ts` — wystarczy dodać `ageStringFromBirthdate`, nie ruszać istniejącej funkcji
- `src/pages/dogs/index.astro:3-13` — wzorzec `createClient + listDogs` do skopiowania
- `Astro.locals.user` zawiera tylko `id` i `email`; imię wymaga osobnego `getProfile()` call
- Kafelek „Mapa spacerów" i „Znajdź psy" oba wskazują na `/owners` — celowe duplikowanie hrefa

## What We're NOT Doing

- Nowe shadcn/ui components (Tabs, Sheet, Badge) — to kolejne slice'y
- Strony `/places` i `/meetings/new` — ich slice'y tworzą te strony, tu tylko chip „Wkrótce"
- React interactivity w tym widoku — czyste Astro SSR
- Sortowanie/filtrowanie psów — pokazujemy zawsze pierwszy z listy

## Implementation Approach

Dwie fazy: najpierw mały helper w `age.ts` (Phase 1), potem pełna przebudowa `dashboard.astro` (Phase 2). Dane pobierane równolegle przez `Promise.all([listDogs, getProfile])` w frontmatterze. Kafelki jako statyczna tablica obiektów z flagą `soon: boolean` — warunkowe renderowanie div vs a.

---

## Phase 1: Age helper

### Overview

Dodanie funkcji `ageStringFromBirthdate` do `src/lib/age.ts`, zwracającej sformatowany wiek psa z latami i miesiącami.

### Changes Required:

#### 1. src/lib/age.ts — ageStringFromBirthdate

**File**: `src/lib/age.ts`

**Intent**: Dodaj wyeksportowaną funkcję obliczającą wiek jako string „lata + miesiące" do użycia na karcie psa. Istniejąca `ageFromBirthdate` pozostaje bez zmian.

**Contract**: `export function ageStringFromBirthdate(birthdate: string | null): string | null`

- Zwraca `null` gdy `birthdate` jest null/invalid
- Gdy wiek < 12 miesięcy: `"{n} mies."`
- Gdy wiek ≥ 12 miesięcy i 0 miesięcy reszty: `"{n} l."`
- Gdy wiek ≥ 12 miesięcy i m miesięcy reszty: `"{n} l. {m} mies."`
- Obliczenie: rok i miesiąc z `new Date(birthdate)` vs `new Date()`, z uwzględnieniem zaokrąglenia w dół gdy aktualny dzień < dzień urodzenia

### Success Criteria:

#### Automated Verification:

- `npm run lint` — 0 błędów/ostrzeżeń

#### Manual Verification:

- `ageStringFromBirthdate("2023-03-15")` (pies ~2 l. 6 mies.) zwraca "2 l. 6 mies." (data zależna od dnia uruchomienia)
- `ageStringFromBirthdate(null)` zwraca `null`

---

## Phase 2: Dashboard rebuild

### Overview

Pełna przebudowa `src/pages/dashboard.astro`: równoległe pobieranie danych, header z powitaniem, karta psa (lub fallback CTA), siatka 6 kafelków.

### Changes Required:

#### 1. src/pages/dashboard.astro — pełna przebudowa

**File**: `src/pages/dashboard.astro`

**Intent**: Zastąpić placeholder kompletnym mobilnym ekranem startowym. Dane psa i profilu pobierane równolegle w frontmatterze; widok renderowany w czystym Astro bez React islands.

**Contract**: Frontmatter importuje `createClient`, `listDogs`, `getProfile`, `ageStringFromBirthdate`. Wywołuje `Promise.all([listDogs(...), getProfile(...)])` gdy `supabase && user`. `displayName` = `profile?.name ?? user.email.split("@")[0]`. `firstDog` = `dogs[0] ?? null`.

Struktura HTML:
```
<Layout title="Start">
  <div class="mx-auto max-w-lg px-4 py-4">
    <!-- Header -->
    <header class="mb-5 flex items-center justify-between">
      <h1>Cześć, {displayName}!</h1>
      <a href="/profile"><!-- avatar lub ikona --></a>
    </header>

    <!-- DogCard lub CTA -->
    {firstDog ? <DogCard dog={firstDog} ageStr={...} /> : <AddDogCta />}

    <!-- Grid 3×2 -->
    <div class="grid grid-cols-3 gap-3">
      {tiles.map(tile => tile.soon ? <SoonTile> : <LinkTile>)}
    </div>
  </div>
</Layout>
```

Kafelki (tablica stałych w frontmatterze):
| label | href | soon |
|---|---|---|
| Zaproponuj spotkanie | /meetings/new | true |
| Znajdź psy | /owners | false |
| Mapa spacerów | /owners | false |
| Moje spotkania | /meetings | false |
| Wydarzenia | /events | false |
| Miejsca | /places | true |

DogCard: `bg-card shadow-card rounded-xl overflow-hidden card-interactive`. Zdjęcie w `<img>` z `aspect-[4/3] object-cover w-full`. Pod zdjęciem: imię (font-semibold), rasa + chip wieku, chevron-right → `/dogs/{firstDog.id}`.

Ikony kafelków i chevron: inline SVG 24×24, stroke-based (wzorzec z `BottomNav.astro`). Każdy kafelek: `flex flex-col items-center gap-1.5 rounded-xl bg-card p-3 shadow-card text-center`.

`SoonTile`: identyczny układ co `LinkTile`, ale owinięty w `<div>` (nie `<a>`), z dodatkowym chipem `<span class="... text-muted-foreground">Wkrótce</span>` i `opacity-60`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` — 0 błędów
- `npm run build` — kompiluje bez błędów TypeScript

#### Manual Verification:

- @ 390px (zalogowany, ma psa): header „Cześć, {imię}", karta psa z zdjęciem/wiekiem, siatka 6 kafelków
- @ 390px (zalogowany, brak psa): fallback CTA „Dodaj pierwszego psa"
- Kafelki „Zaproponuj spotkanie" i „Miejsca": nieaktywne (div), chip „Wkrótce", opacity-60
- Klik na kartę psa → `/dogs/{id}`
- Klik na „Znajdź psy" → `/owners`
- „Moje spotkania" → `/meetings`
- „Wydarzenia" → `/events`

---

## Testing Strategy

### Manual Testing Steps:

1. `npm run dev` → zaloguj się → sprawdź header z imieniem
2. Upewnij się, że masz psa w profilu → karta psa widoczna
3. Kliknij kartę psa → `/dogs/{id}` otwiera się
4. Sprawdź wiek psa — format „X l. Y mies."
5. Kliknij kafelek „Znajdź psy" → `/owners`
6. Upewnij się, że „Zaproponuj spotkanie" nie jest klikalny (div) z chipem Wkrótce
7. Usuń psa z profilu (lub użyj innego konta bez psa) → fallback CTA

## References

- Wzorzec supabase + serwis: `src/pages/dogs/index.astro:1-14`
- Wzorzec inline SVG ikon: `src/components/BottomNav.astro`
- Token source: `src/styles/global.css`
- Typy danych: `src/types.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Age helper

#### Automated

- [x] 1.1 npm run lint — 0 błędów — cabd5df

#### Manual

- [x] 1.2 ageStringFromBirthdate zwraca poprawny format — cabd5df
- [x] 1.3 ageStringFromBirthdate(null) zwraca null — cabd5df

### Phase 2: Dashboard rebuild

#### Automated

- [x] 2.1 npm run lint — 0 błędów
- [x] 2.2 npm run build — brak błędów TypeScript

#### Manual

- [x] 2.3 Header z imieniem widoczny @ 390px
- [x] 2.4 Karta psa z wiekiem (zalogowany z psem)
- [x] 2.5 Fallback CTA gdy brak psa
- [x] 2.6 Kafelki Wkrótce: nieaktywne, chip widoczny
- [x] 2.7 Nawigacja: klik karty psa i kafelków działa
