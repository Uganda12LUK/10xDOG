# Meeting Form — Implementation Plan

> Change: `context/changes/ui-meeting-form/`

## Overview

Nowa strona `/meetings/new` z formularzem propozycji spotkania: wybór typu (spacer/hodowla), wybór psa, data+czas oraz statyczny pin Leaflet w centrum miasta odbiorcy. Formularz wymaga dwóch migracji (`dog_id`, `scheduled_at`) i rozszerzenia istniejącego API.

## Current State Analysis

`/meetings/new` nie istnieje (FAB na `/meetings` kieruje na 404). Strona `/owners/[id].astro` ma jednoklinkowy przycisk "Send walk invitation" z hardcoded `type="walk"` — brak wyboru psa, daty, ani typu. API `POST /api/invitations` przyjmuje tylko `receiver_id` i `type`.

### Key Discoveries

- `Invitation` interface (`src/types.ts:36`) nie ma `dogId`/`scheduledAt` → potrzeba rozszerzenia type + serwisu.
- `InvitationRow` + `mapRow` + `sendInvitation` (`src/lib/services/invitation.ts:5–43`) — zmiana minimalna, tylko nowe pola.
- Trigger `guard_invitation_update` (`supabase/migrations/20260926090002`) sprawdza wyłącznie kolumny `id`, `sender_id`, `receiver_id`, `type`, `created_at`, `status` — nowe kolumny INSERT-only, trigger nie wymaga zmian.
- `DogMap.tsx:7` eksportuje `CITY_CENTERS` (mapowanie `city → [lat, lng]`) — gotowe do użycia jako środek statycznego pina.
- `OwnersMapView.tsx` używa `client:only="react"` — ten sam pattern dla MeetingForm (Leaflet importuje CSS na poziomie modułu, brak SSR guard wewnątrz komponentu).
- `listDogs(client, ownerId)` (`src/lib/services/dog.ts`) — gotowe do pobrania psów zalogowanego użytkownika.

## Desired End State

Użytkownik wchodzi na `/meetings/new?receiver_id=<uuid>`, widzi imię odbiorcy i pin na mapie w jego mieście, wybiera typ (Walk/Breeding), opcjonalnie wskazuje jednego psa chipem, wpisuje datę i godzinę, klika "Wyślij". Po sukcesie trafia na `/meetings` gdzie widzi nowe zaproszenie w zakładce Propozycje.

## What We're NOT Doing

- Picker właściciela w formularzu — receiver pochodzi wyłącznie z `?receiver_id=` URL.
- Interaktywna mapa do wyboru miejsca — brak kolumn lat/lng, pin jest dekoracyjny.
- Edycja lub anulowanie zaproszenia z formularza.
- Walidacja daty (np. nie można wysłać na przeszłość) — MVP.
- Wielokrotny wybór psów — co najwyżej jeden chip aktywny.

## Implementation Approach

SSR strona (`new.astro`) pobiera profil odbiorcy i psy zalogowanego użytkownika, przekazuje jako propsy do `<MeetingForm client:only="react" />`. Formularz wysyła POST do istniejącego `/api/invitations` (rozszerzonego o `dog_id` + `scheduled_at`). Po sukcesie API przekierowuje na `/meetings`.

## Critical Implementation Details

`<input type="datetime-local">` wysyła wartość w formacie `2026-09-28T14:30` (bez strefy czasowej). Postgres przyjmie to i zinterpretuje w strefie serwera — dla MVP polskiego rynku to wystarczy; nie konwertować po stronie klienta.

Leaflet wymaga `client:only="react"` na całym `MeetingForm`, bo importuje `leaflet/dist/leaflet.css` na poziomie modułu — SSR rzuci błąd. Strona `new.astro` może renderować SSR header/breadcrumb normalnie; tylko wyspa formularza jest client-only.

---

## Phase 1: Schema, Types, Service

### Overview

Dwie migracje SQL, rozszerzenie `Invitation` interface i aktualizacja warstwy serwisowej. Podstawa dla wszystkich pozostałych faz.

### Changes Required:

#### 1. Migracja: dodaj dog_id i scheduled_at

**File**: `supabase/migrations/20260928090001_add_dog_scheduled_to_invitations.sql`

**Intent**: Dodać dwie opcjonalne kolumny do tabeli `invitations` — nullable FK do `dogs` i nullable timestamptz dla daty spotkania.

**Contract**:
```sql
ALTER TABLE invitations
  ADD COLUMN dog_id uuid REFERENCES dogs (id) ON DELETE SET NULL,
  ADD COLUMN scheduled_at timestamptz;
```
Obie kolumny nullable, brak zmian w RLS ani triggerze. Istniejące wiersze dostaną NULL w obu polach.

#### 2. Invitation interface: dogId, scheduledAt

**File**: `src/types.ts`

**Intent**: Dodać `dogId` i `scheduledAt` do `Invitation` interface — nullable, bo istniejące zaproszenia ich nie mają.

**Contract**: Dodaj do `Invitation` (po `updatedAt`):
- `dogId: string | null`
- `scheduledAt: string | null`

#### 3. Invitation service: InvitationRow, mapRow, sendInvitation

**File**: `src/lib/services/invitation.ts`

**Intent**: Zsynchronizować `InvitationRow` z nowym schematem, zmapować nowe pola w `mapRow` i dodać opcjonalne parametry do `sendInvitation`.

**Contract**:
- `InvitationRow` (line 5): dodaj `dog_id: string | null` i `scheduled_at: string | null`
- `mapRow` (line 15): dodaj `dogId: row.dog_id` i `scheduledAt: row.scheduled_at`
- `sendInvitation` (line 27): rozszerz sygnaturę o `dogId?: string | null` i `scheduledAt?: string | null`; dodaj je do obiektu insertu

### Success Criteria:

#### Automated Verification:

- Plik migracji istnieje: `supabase/migrations/20260928090001_add_dog_scheduled_to_invitations.sql`
- `npm run build` kończy się bez błędów TypeScript
- `npm run lint` przechodzi bez błędów

#### Manual Verification:

- `Invitation` w types.ts ma pola `dogId` i `scheduledAt`

---

## Phase 2: API Extension

### Overview

Rozszerzenie `POST /api/invitations` o opcjonalne `dog_id` i `scheduled_at`. Zmiana redirect target na `/meetings`.

### Changes Required:

#### 1. Zod schema + pass-through + redirect

**File**: `src/pages/api/invitations/index.ts`

**Intent**: Przyjmować nowe opcjonalne pola z formularza i przekazywać do `sendInvitation`. Zmienić cel przekierowania po sukcesie na `/meetings`.

**Contract**:
- Zod schema: dodaj `dog_id: z.uuid().nullish()` i `scheduled_at: z.string().nullish()`
- Czytaj z formData i przekazuj do `sendInvitation(supabase, user.id, receiver_id, type, dog_id, scheduled_at)`
- Zmień `context.redirect("/owners/${...}?sent=1")` na `context.redirect("/meetings")`

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi bez błędów
- `npm run build` kończy się bez błędów

#### Manual Verification:

- Formularz z samym `receiver_id` i `type` (bez `dog_id`/`scheduled_at`) poprawnie wysyła zaproszenie i trafia na `/meetings`

---

## Phase 3: MeetingForm Component

### Overview

Nowy React island `MeetingForm.tsx` z radiobuttonami typu, chipami psów, date pickerem i statycznym pinem Leaflet.

### Changes Required:

#### 1. MeetingForm.tsx

**File**: `src/components/meetings/MeetingForm.tsx`

**Intent**: Formularz propozycji spotkania — obsługuje wybór typu, opcjonalny wybór psa, datę i statyczną mapę. Wysyła POST do `/api/invitations` jako native form submit.

**Contract**:

Props:
```ts
interface Props {
  receiver: { id: string; name: string; city: string | null };
  dogs: Dog[];
  error?: string;
}
```

Formularz: `<form method="POST" action="/api/invitations">` z hidden `receiver_id`.

Sekcje formularza:
- **Typ**: dwa `<input type="radio" name="type">` — `walk` (Walk) i `breeding` (Breeding), required
- **Psy**: poziomy scroll chipów z psami użytkownika; kliknięcie chip → aktywny styl + ustawia `<input type="hidden" name="dog_id">`. Brak selekcji = brak pola (empty hidden). Sekcja pomijana gdy `dogs.length === 0`.
- **Data i czas**: `<input type="datetime-local" name="scheduled_at" required>`
- **Mapa**: `<MapContainer>` non-interactive (scrollWheelZoom=false, dragging=false, zoomControl=false), height ~160px. Środek z `CITY_CENTERS[receiver.city ?? ""] ?? CITY_CENTERS["Warszawa"]` (import z `@/components/map/DogMap`). Marker: `L.divIcon` z prostym pinem (`className="text-primary text-2xl"`, html `📍`).
- **Submit**: przycisk "Wyślij zaproszenie"

Import Leaflet: `import "leaflet/dist/leaflet.css"` na poziomie modułu → całość musi być `client:only="react"`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi bez błędów
- `npm run build` kończy się bez błędów

#### Manual Verification:

- Komponenty Walk/Breeding radio renderują się i są klikalnie
- Chipy psów pojawiają się gdy user ma psy; kliknięcie zaznacza jeden
- Pole datetime jest widoczne
- Mapa Leaflet renderuje się z pinem w mieście odbiorcy (lub Warszawa jako fallback)

---

## Phase 4: Page + Integration

### Overview

Nowa strona `/meetings/new.astro`, aktualizacja `/owners/[id].astro` — zastąpienie one-click buttona linkiem do formularza.

### Changes Required:

#### 1. /meetings/new.astro

**File**: `src/pages/meetings/new.astro`

**Intent**: SSR strona do renderowania `MeetingForm`. Waliduje param, pobiera dane odbiorcy i psów równolegle, obsługuje stany błędów.

**Contract**:
- `receiver_id = Astro.url.searchParams.get("receiver_id")` — brak → `Astro.redirect("/owners")`
- Niezalogowany → `Astro.redirect("/auth/signin")`
- `[receiverProfile, myDogs] = await Promise.all([getProfile(supabase, receiver_id), listDogs(supabase, user.id)])`
- `receiverProfile === null` → render karty "Nie znaleziono właściciela" z linkiem powrotnym do `/owners`
- `error = Astro.url.searchParams.get("error")` → przekazać do `<MeetingForm error={error ?? undefined} />`
- `<MeetingForm receiver={...} dogs={myDogs} client:only="react" />`

#### 2. /owners/[id].astro — zastąp przycisk linkiem

**File**: `src/pages/owners/[id].astro`

**Intent**: Zamiast wysyłać zaproszenie jednym kliknięciem, przenieść użytkownika do formularza gdzie może wybrać typ, psa i datę.

**Contract**:
- Zastąp blok `<form method="POST" action="/api/invitations">` (line 113–123) przez `<a href={/meetings/new?receiver_id=${ownerId}}>Zaproponuj spotkanie</a>` — ten sam styl co obecny przycisk (`w-full rounded-lg bg-primary …`).
- Blok "Invitation sent — awaiting response" (pending state, line 105–111) pozostaje bez zmian.

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi bez błędów
- `npm run build` kończy się bez błędów

#### Manual Verification:

- `/meetings/new` bez `receiver_id` przekierowuje na `/owners`
- `/meetings/new?receiver_id=<valid-uuid>` renderuje imię odbiorcy i formularz
- Wypełnienie formularza i submit → przekierowanie na `/meetings`, zakładka Propozycje pokazuje nowe zaproszenie
- `/owners/{id}` ma link "Zaproponuj spotkanie" (nie one-click form)
- Na urządzeniu mobilnym formularz i mapa ładują się poprawnie

---

## Testing Strategy

### Manual Testing Steps:

1. Kliknij "Zaproponuj spotkanie" na stronie `/owners/{id}` — powinno trafić na `/meetings/new?receiver_id=...`
2. Sprawdź renderowanie: imię odbiorcy, mapa z pinem, radiobuttony, chipy psów (jeśli masz psy)
3. Wybierz typ Breeding, zaznacz psa, ustaw datę/czas → kliknij Wyślij
4. Potwierdź redirect na `/meetings`, zakładka Propozycje → karta z nowym zaproszeniem
5. Wróć na `/owners/{id}` — przycisk powinien być teraz nieaktywny ("Invitation sent…")
6. Test mobile (375px): formularz nie ucina się, mapa widoczna, FAB nie nakłada się

## References

- Research: `context/changes/ui-meeting-form/research.md`
- Change notes: `context/changes/ui-meeting-form/change.md`
- Invitation service: `src/lib/services/invitation.ts`
- Dog service: `src/lib/services/dog.ts`
- Map component: `src/components/map/DogMap.tsx`
- Analogous React island z Leaflet: `src/components/map/OwnersMapView.tsx`
- Owners page pattern: `src/pages/owners/[id].astro`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Schema, Types, Service

#### Automated

- [x] 1.1 Plik migracji `20260928090001_add_dog_scheduled_to_invitations.sql` istnieje
- [x] 1.2 `npm run build` kończy się bez błędów TypeScript
- [x] 1.3 `npm run lint` przechodzi bez błędów

#### Manual

- [x] 1.4 `Invitation` w types.ts ma pola `dogId` i `scheduledAt`

### Phase 2: API Extension

#### Automated

- [ ] 2.1 `npm run lint` przechodzi bez błędów
- [ ] 2.2 `npm run build` kończy się bez błędów

#### Manual

- [ ] 2.3 Formularz bez `dog_id`/`scheduled_at` poprawnie wysyła zaproszenie i trafia na `/meetings`

### Phase 3: MeetingForm Component

#### Automated

- [ ] 3.1 `npm run lint` przechodzi bez błędów
- [ ] 3.2 `npm run build` kończy się bez błędów

#### Manual

- [ ] 3.3 Komponenty Walk/Breeding radio renderują się i są klikalne
- [ ] 3.4 Chipy psów pojawiają się i kliknięcie zaznacza jeden
- [ ] 3.5 Pole datetime jest widoczne
- [ ] 3.6 Mapa Leaflet renderuje się z pinem w mieście odbiorcy

### Phase 4: Page + Integration

#### Automated

- [ ] 4.1 `npm run lint` przechodzi bez błędów
- [ ] 4.2 `npm run build` kończy się bez błędów

#### Manual

- [ ] 4.3 `/meetings/new` bez `receiver_id` przekierowuje na `/owners`
- [ ] 4.4 `/meetings/new?receiver_id=<uuid>` renderuje formularz z imieniem odbiorcy
- [ ] 4.5 Pełny submit formularza → redirect na `/meetings`, zakładka Propozycje
- [ ] 4.6 `/owners/{id}` ma link "Zaproponuj spotkanie" zamiast one-click form
- [ ] 4.7 Na mobile formularz i mapa ładują się poprawnie
