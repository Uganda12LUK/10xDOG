# Meetings Screen — Tabs Implementation Plan

> Change: `context/changes/ui-meetings-tabs/`

## Overview

Przebudowa ekranu `/meetings` z płaskiej listy na widok z trzema zakładkami (Nadchodzące / Moje propozycje / Historia) plus pływający przycisk akcji (FAB) prowadzący do `/meetings/new`.

## Current State Analysis

`src/pages/meetings/index.astro` renderuje pojedynczą płaską listę zaakceptowanych spotkań (`listAcceptedMeetings`). Brak zakładek, brak FAB, brak sekcji "Moje propozycje". Serwis `listSentPending` istnieje w `src/lib/services/invitation.ts:78` ale nie jest używany na tej stronie.

Brak zainstalowanych komponentów shadcn `tabs` i `badge`. Istnieje `src/components/ui/LibBadge.astro` — komponent Astro, nie nadaje się do React island.

### Key Discoveries:

- `Invitation` nie ma pola `scheduledAt` — tylko `createdAt` i `updatedAt` (`src/types.ts:36-44`). Nie można rozróżnić nadchodzących od historycznych po dacie spotkania.
- `listSentPending` w `src/lib/services/invitation.ts:78` zwraca pending wysłane przez użytkownika — gotowe do zakładki "Moje propozycje".
- `listAcceptedMeetings` w `src/lib/services/invitation.ts:105` zwraca wszystkie zaakceptowane (obie strony) — gotowe do zakładki "Nadchodzące".
- Tokeny: `--primary: #C4461F`, `--accent`, `--muted-foreground`, `--shadow-card` z `src/styles/global.css`.
- BottomNav jest `md:hidden` — FAB musi unikać nakładania się na nav na mobile (bottom offset).

## Desired End State

Ekran `/meetings` wyświetla trzy zakładki:
- **Nadchodzące**: wszystkie zaakceptowane spotkania jako `MeetingCard` (nazwa rozmówcy, odznaka typu, data przyjęcia).
- **Moje propozycje**: propozycje wysłane przez użytkownika ze statusem "Oczekuje".
- **Historia**: pusty stan z komunikatem "Zakończone spacery pojawią się tutaj".

FAB (`+`) w prawym dolnym rogu → `/meetings/new`.

## What We're NOT Doing

- Podział Nadchodzące/Historia po dacie — brak pola `scheduledAt` w schemacie.
- Anulowanie propozycji z zakładki "Moje propozycje" — tylko widok read-only.
- Budowa strony `/meetings/new` — FAB prowadzi do niej jako link, ale strona należy do osobnego slice'a.
- Paginacja — lista MVP bez paginacji.

## Implementation Approach

SSR strona (`index.astro`) fetchuje oba zestawy danych równolegle, buduje wspólną `profileMap`, serializuje do `Record<string, {name: string}>` i przekazuje do `<MeetingsView client:load />`. Zakładki są obsługiwane po stronie klienta przez shadcn `Tabs`. `MeetingCard` jako inline sub-komponent w `MeetingsView.tsx`.

## Critical Implementation Details

`profileMap` przekazywana jako prop React musi być serializowalnym obiektem — `Map` nie przechodzi przez granicę Astro→React. Serializuj do `Record<string, {name: string}>` w frontmatter Astro.

FAB na mobile musi mieć `bottom` uwzględniający wysokość BottomNav (`pb-safe-area-inset-bottom` + dodatkowy offset dla nav `md:bottom-6 bottom-20`). BottomNav ma `h-[70px]` (`src/components/BottomNav.astro:46`), więc `bottom-20` (80px) daje wystarczający odstęp.

Użyj `client:load` (SSR + hydration) zamiast `client:only="react"`. MeetingsView nie importuje żadnych browser-only APIs (w przeciwieństwie do OwnersMapView z Leafletem) — `client:load` jest bezpieczny i szybszy (TTI bez flasha treści).

---

## Phase 1: Dependencies

### Overview

Instalacja shadcn `tabs` i `badge` — dwa komponenty wymagane przez `MeetingsView.tsx`.

### Changes Required:

#### 1. shadcn tabs

**File**: `src/components/ui/tabs.tsx` (tworzony przez npx shadcn)

**Intent**: Zainstalować shadcn `tabs` za pomocą `npx shadcn@latest add tabs`. Komponent jest wymagany przez `MeetingsView.tsx`.

**Contract**: Po instalacji musi istnieć `src/components/ui/tabs.tsx` eksportujący `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.

#### 2. shadcn badge

**File**: `src/components/ui/badge.tsx` (tworzony przez npx shadcn)

**Intent**: Zainstalować shadcn `badge` za pomocą `npx shadcn@latest add badge`. Używany w `MeetingCard` do wyświetlenia odznaki typu (Walk/Breeding) i "Oczekuje".

**Contract**: Po instalacji musi istnieć `src/components/ui/badge.tsx` eksportujący `Badge` z wariantem `outline` (domyślnie dostępny w shadcn new-york).

### Success Criteria:

#### Automated Verification:

- `src/components/ui/tabs.tsx` istnieje po instalacji.
- `src/components/ui/badge.tsx` istnieje po instalacji.
- `npm run lint` przechodzi bez błędów.
- `npm run build` kończy się bez błędów.

#### Manual Verification:

- Oba pliki widoczne w `src/components/ui/`.

---

## Phase 2: MeetingsView Component

### Overview

Nowy plik `src/components/meetings/MeetingsView.tsx` — React island z shadcn `Tabs`, inline `MeetingCard` i FAB.

### Changes Required:

#### 1. MeetingsView.tsx

**File**: `src/components/meetings/MeetingsView.tsx`

**Intent**: Główny komponent React renderujący trzy zakładki i FAB. Przyjmuje zaserializowane dane z Astro i nie potrzebuje dostępu do Supabase.

**Contract**: Props:
```ts
interface Props {
  accepted: Invitation[];
  sentPending: Invitation[];
  profiles: Record<string, { name: string }>;
  userId: string;
}
```

Renderuje `<Tabs defaultValue="nadchodzace">` z trzema `TabsContent`:
- `"nadchodzace"` → lista `<MeetingCard>` z `accepted`, puste gdy brak: "Brak nadchodzących spotkań. Zaproponuj spacer →"
- `"propozycje"` → lista `<MeetingCard>` z `sentPending`, puste: "Brak wysłanych propozycji."
- `"historia"` → pusty stan: "Zakończone spacery pojawią się tutaj."

`MeetingCard` jako inline function component wewnątrz tego samego pliku (nie osobny plik). Wyświetla: nazwa rozmówcy (lookup w `profiles`), `<Badge>` z typem (`Walk`/`Breeding`), `<Badge variant="outline">` z `Oczekuje` tylko dla sentPending, datę.

FAB: `<a href="/meetings/new">` z klasami `fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl`.

Importy: `@/components/ui/tabs`, `@/components/ui/badge`, `@/types` (tylko `Invitation`).

#### 2. Nowy katalog

**File**: `src/components/meetings/` (katalog)

**Intent**: Utwórz katalog `src/components/meetings/` grupujący komponenty ekranu spotkań.

**Contract**: Katalog musi istnieć przed zapisem `MeetingsView.tsx`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi bez błędów na `src/components/meetings/MeetingsView.tsx`.
- `npm run build` kończy się bez błędów.

#### Manual Verification:

> Uwaga: weryfikacja 2.3–2.5 wykonywana na końcu Fazy 3 po wpięciu komponentu w stronę — nie blokuje przejścia do Fazy 3.

- Komponent renderuje się wizualnie z trzema zakładkami.
- Zakładka Nadchodzące pokazuje karty lub pusty stan.
- Zakładka Moje propozycje pokazuje karty lub pusty stan.
- Zakładka Historia pokazuje pusty stan z komunikatem.
- FAB widoczny w prawym dolnym rogu, link działa (prowadzi do /meetings/new lub 404).
- Na mobile FAB nie nakłada się na BottomNav.

---

## Phase 3: Page Wiring

### Overview

Aktualizacja `src/pages/meetings/index.astro` — dodanie `listSentPending`, rozbudowa `profileMap`, podmiana inline HTML na `<MeetingsView client:load />`.

### Changes Required:

#### 1. meetings/index.astro — frontmatter

**File**: `src/pages/meetings/index.astro`

**Intent**: Dodać import `listSentPending` i wywołać go równolegle z `listAcceptedMeetings`. Rozbudować zbieranie ID profili o receiverId z `sentPending`. Serializować `profileMap` do `Record<string, {name:string}>`.

**Contract**:
- Import: dodaj `listSentPending` do istniejącego importu z `@/lib/services/invitation`.
- Import: dodaj `MeetingsView` z `@/components/meetings/MeetingsView`.
- Deklaracja: `let sentPending: Invitation[] = []`.
- W bloku `if (supabase && user)`: wywołaj `listSentPending(supabase, user.id)` i przypisz do `sentPending`. Zbieraj również `receiverId` z `sentPending` do `counterpartyIds`.
- Serializuj: `const profilesObj: Record<string, {name:string}> = {}; for (const [id, p] of profileMap) if (p) profilesObj[id] = {name: p.name};`

#### 2. meetings/index.astro — template

**File**: `src/pages/meetings/index.astro`

**Intent**: Zastąpić inline HTML listę spotkań wywołaniem `<MeetingsView>`. Usunąć stary `<ul>` z kartami i warunek `meetings.length === 0`.

**Contract**: W sekcji template zastąp cały blok `{errorMsg ? … : meetings.length === 0 ? … : (…)}` wywołaniem:
```astro
{errorMsg ? (
  <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center text-destructive">
    {errorMsg}
  </div>
) : (
  <MeetingsView
    accepted={meetings}
    sentPending={sentPending}
    profiles={profilesObj}
    userId={user?.id ?? ""}
    client:load
  />
)}
```
Zachowaj tytuł `<h1>Spotkania</h1>` (zmień z "Meetings" na "Spotkania" dla spójności z UI w języku polskim).

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi bez błędów.
- `npm run build` kończy się bez błędów.

#### Manual Verification:

- Strona `/meetings` ładuje się bez błędów.
- Zakładki działają (kliknięcie przełącza treść).
- Akceptowane spotkania pojawiają się w zakładce Nadchodzące.
- Wysłane propozycje pojawiają się w zakładce Moje propozycje.
- Historia pokazuje pusty stan.
- FAB działa jako link.
- Na urządzeniu mobilnym BottomNav i FAB nie nakładają się.

---

## Testing Strategy

### Manual Testing Steps:

1. Otwórz `/meetings` — sprawdź czy strona ładuje się.
2. Kliknij zakładkę "Moje propozycje" — lista lub pusty stan.
3. Kliknij zakładkę "Historia" — pusty stan z komunikatem.
4. Kliknij FAB `+` — przejście do `/meetings/new` (404 akceptowalne).
5. Na mobile (devtools 375px) — sprawdź czy FAB nie nakłada się na BottomNav.

## References

- Change notes: `context/changes/ui-meetings-tabs/change.md`
- Invitation service: `src/lib/services/invitation.ts`
- Current page: `src/pages/meetings/index.astro`
- Design tokens: `src/styles/global.css`
- Analogiczny wzorzec React island: `src/components/map/OwnersMapView.tsx`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Dependencies

#### Automated

- [x] 1.1 `src/components/ui/tabs.tsx` istnieje po instalacji — d48024a
- [x] 1.2 `src/components/ui/badge.tsx` istnieje po instalacji — d48024a
- [x] 1.3 `npm run lint` przechodzi bez błędów — d48024a
- [x] 1.4 `npm run build` kończy się bez błędów — d48024a

#### Manual

- [x] 1.5 Oba pliki widoczne w `src/components/ui/` — d48024a

### Phase 2: MeetingsView Component

#### Automated

- [x] 2.1 `npm run lint` przechodzi bez błędów na MeetingsView.tsx
- [x] 2.2 `npm run build` kończy się bez błędów

#### Manual

- [x] 2.3 Komponent renderuje trzy zakładki
- [x] 2.4 Zakładka Historia pokazuje pusty stan
- [x] 2.5 FAB widoczny, nie nakłada się na BottomNav na mobile

### Phase 3: Page Wiring

#### Automated

- [x] 3.1 `npm run lint` przechodzi bez błędów
- [x] 3.2 `npm run build` kończy się bez błędów

#### Manual

- [ ] 3.3 Strona `/meetings` ładuje się bez błędów w przeglądarce
- [ ] 3.4 Zakładki działają poprawnie (przełączanie treści)
- [ ] 3.5 Dane spotkań i propozycji pojawiają się w odpowiednich zakładkach
