# Walk-invitations state machine — refactoring plan

## Overview

Refaktoryzacja maszyny stanów zaproszeń na spacer: wydobycie **lekkiego modelu domeny** (jawny typ stanów + czysta funkcja przejścia + typy zdarzeń) w miejsce rozsianych literałów, domknięcie invariantów **defense-in-depth**, uporządkowanie warstwy DB (usunięcie redundantnego triggera + CHECK-backstop), uzupełnienie **testów kluczowych invariantów** i spisanie **notatek DDD** w `context/domain/`. Zachowuje istniejące zachowanie (zielony suite po każdej fazie). Artefakt L4+L5 odznaki 10xArchitect.

## Current State Analysis

Z `research.md` (HEAD 32daad6):
- 3 stany `pending|accepted|declined`, jedno przejście `pending → accepted|declined`, brak cancel/re-open. „Spotkanie" = wiersz `invitations` ze `status='accepted'` (`src/lib/services/invitation.ts:135-148`).
- Invarianty rozłożone na DB/serwis/API z niejednolitą dyscypliną (tabela Invariant→warstwa w research).
- **Redundancja:** `20261014090001_harden_consent_rls.sql:101-105` tworzy trigger `invitations_enforce_update`, ale nie DROP-uje starego `invitations_guard_update` z `20260926090002` — oba odpalają się na UPDATE.
- **Jednowarstwowe:** własność psa tylko w serwisie (`invitation.ts:48-53`); `scheduled_at` nie-w-przeszłości i zakres lat/lng tylko w zod (`api/invitations/index.ts:12-24`) — DB bez CHECK.
- **Duplikat-pending:** partial unique index `invitations_no_duplicate_pending` (`create:22-24`) to jedyny guard zapisu; POST nie pre-czeka → surowy błąd Postgresa → 500 (`invitation.ts:70`, `index.ts:84-88`).
- **Luki testowe:** duplikat-pending, własność psa, self-invite CHECK, odmowa update nie-receivera, przeszła data (lista w research § Pokrycie testami).

## Desired End State

- Jeden moduł domenowy deklaruje stany, legalne przejścia i zdarzenia; serwis i zod go konsumują — brak rozsianych literałów `"pending"/"accepted"`.
- Guard własności psa i „respond tylko gdy pending" wyrażone także w serwisie (defense-in-depth), nie tylko w DB.
- Duplikat-pending zwraca przyjazny **409** (zamiast 500); DB nadal twardym guardem.
- Jedna idempotentna migracja: brak redundantnego triggera, CHECK na zakres lat/lng.
- Testy pokrywają 5 kluczowych invariantów + funkcję przejścia jednostkowo.
- `context/domain/invitation.md` opisuje agregat, ubikwistyczny język, zdarzenia i granice kontekstu.
- Weryfikacja: `npm run test` zielony; `npm run lint` i `astro check` czyste; duplikat zwraca 409 w ręcznym teście.

### Key Discoveries:
- Serwis jest cienką warstwą mapującą (`mapRow`, `invitation.ts:20-34`) — model domeny trzeba wprowadzić obok, nie przepisywać persystencji.
- Trigger `enforce_invitation_update` już egzekwuje przejścia (`harden:80-99`) — model domeny w TS to *lustro* reguł DB, nie nowy autorytet.
- Supabase zwraca błąd unique-violation z `code === "23505"` — mapowalne w API bez dodatkowego zapytania.
- Konwencja migracji: `YYYYMMDDHHmmss_opis.sql`, idempotentne (`drop ... if exists`), RLS-aware (CLAUDE.md + `harden` jako wzór).

## What We're NOT Doing

- **Pełny agregat z repozytorium/ORM** — zostajemy przy cienkim serwisie + Supabase (decyzja: lekki model domeny).
- **Osobna tabela `meetings`** — „meeting" pozostaje widokiem accepted-invitation.
- **Flow hodowlany (breeding, S-08)** — `type='breeding'` zostaje scaffoldem, bez nowej logiki.
- **CHECK na `scheduled_at` nie-w-przeszłości** — reguła jest względem `now()`, nie da się jej wyrazić stabilnym CHECK; zostaje w zod (udokumentowane).
- **Testy gałęzi 401/400/500 `respond.ts`** — poza zakresem (decyzja: tylko kluczowe invarianty).
- **Zmiany UI/i18n** — refaktor jest backendowy; komponenty `meetings/*` bez zmian funkcjonalnych.

## Implementation Approach

Przyrostowo, zachowując zachowanie: najpierw wprowadzamy model domeny i podpinamy go bez zmiany reguł (faza 1), potem wzmacniamy egzekwowanie w serwisie/API (faza 2), porządkujemy DB (faza 3), dowodzimy invarianty testami (faza 4) i spisujemy model jako notatki DDD (faza 5). Suite musi być zielony po każdej fazie — to refaktor w strefie ryzyka #2.

## Phase 1: Model domeny

### Overview
Wprowadź jawny, testowalny model domeny zaproszenia; serwis i zod konsumują go zamiast literałów.

### Changes Required:

#### 1. Nowy moduł domenowy
**File**: `src/lib/domain/invitation.ts`
**Intent**: Jedno źródło prawdy dla stanów, legalnych przejść i zdarzeń maszyny stanów — lustro reguł DB w TS, czyste (bez I/O), w pełni testowalne.
**Contract**: Eksportuje `INVITATION_STATUSES`/`InvitationStatus` (`"pending"|"accepted"|"declined"`), `INVITATION_TYPES`/`InvitationType`, czystą funkcję przejścia `respond(current: InvitationStatus, action: "accepted"|"declined"): InvitationStatus` rzucającą gdy `current !== "pending"` (lustro `harden:91-92`), predykat `canRespond(status)`, oraz typy zdarzeń domenowych `InvitationSent | InvitationAccepted | InvitationDeclined`. Bez zależności od Supabase/zod.

#### 2. Konsumpcja w serwisie
**File**: `src/lib/services/invitation.ts`
**Intent**: Zastąp literały stringowe importami z modułu domeny; `Invitation` DTO używa `InvitationStatus`/`InvitationType`.
**Contract**: Podmiana `"pending"/"accepted"/"declined"` w `.eq(...)` i `mapRow` na stałe z domeny. Bez zmiany sygnatur publicznych funkcji serwisu.

#### 3. Konsumpcja w zod (API)
**File**: `src/pages/api/invitations/index.ts`, `src/pages/api/invitations/respond.ts`
**Intent**: `z.enum(...)` dla `type` i `action` budowane z domenowych stałych, nie z inline-literałów.
**Contract**: `z.enum(INVITATION_TYPES)` / `z.enum(["accepted","declined"])` wywiedzione z domeny; zachowane komunikaty walidacji.

#### 4. Współdzielony typ
**File**: `src/types.ts`
**Intent**: `Invitation.status`/`.type` typowane aliasami z domeny zamiast inline-union.
**Contract**: `status: InvitationStatus; type: InvitationType` (import typu z `@/lib/domain/invitation`).

### Success Criteria:
#### Automated Verification:
- Typecheck przechodzi: `npx astro check`
- Lint przechodzi: `npm run lint`
- Istniejący suite zielony (bez regresji): `npm run test`
#### Manual Verification:
- Przegląd: brak pozostałych literałów statusów poza modułem domeny (grep `"pending"`/`"accepted"` w `src/lib/services` i `src/pages/api/invitations`).

**Implementation Note**: Po przejściu automatycznej weryfikacji zatrzymaj się na potwierdzenie manualne przed fazą 2.

---

## Phase 2: Invarianty serwis/API

### Overview
Wyraź jednowarstwowe invarianty także w serwisie (defense-in-depth) i zmapuj duplikat-pending na 409.

### Changes Required:

#### 1. „Respond tylko gdy pending" w serwisie
**File**: `src/lib/services/invitation.ts`
**Intent**: `respondToInvitation` jawnie filtruje pending i używa domenowego `respond()`, zamiast polegać wyłącznie na DB.
**Contract**: Dodaj `.eq("status", "pending")` do update-query; gdy update nie trafia wiersza → rzuć czytelny `Error("Invitation is no longer pending")` zamiast surowego błędu `.single()`. Zachowuje `.eq("receiver_id", userId)`.

#### 2. Guard własności psa — czytelny błąd domenowy
**File**: `src/lib/services/invitation.ts`
**Intent**: Zachowaj istniejący guard (`:48-53`), ale ujednolić komunikat jako błąd domenowy (spójny z resztą).
**Contract**: Bez zmiany semantyki; `throw new Error("Invalid dog selection")` pozostaje trust-boundary. (Dokumentowane w notatkach DDD jako invariant serwisowy.)

#### 3. Mapowanie duplikatu na 409
**File**: `src/pages/api/invitations/index.ts`
**Intent**: Złap naruszenie partial-unique-index i zwróć przyjazny sygnał zamiast 500.
**Contract**: W `catch` rozróżnij błąd Postgresa `code === "23505"` (lub dopasowanie nazwy `invitations_no_duplicate_pending`) → `redirect(/meetings/new?receiver_id=...&error=...)` lub 409 JSON z komunikatem „Masz już oczekujące zaproszenie"; pozostałe błędy nadal 500 (zachowany log bez PII `:74-80`). Snippet rozróżnienia:
```ts
const code = (err as { code?: string })?.code;
if (code === "23505") { /* duplicate pending → friendly 409/redirect */ }
```

### Success Criteria:
#### Automated Verification:
- Lint + typecheck czyste: `npm run lint` && `npx astro check`
- Suite zielony: `npm run test`
#### Manual Verification:
- Wysłanie drugiego zaproszenia do tej samej osoby (pending) zwraca przyjazny komunikat/409, nie 500 (preview build).
- Odpowiedź na już zaakceptowane zaproszenie daje czytelny błąd, nie surowy komunikat DB.

**Implementation Note**: Zatrzymaj się na potwierdzenie manualne przed fazą 3.

---

## Phase 3: Backstop DB

### Overview
Jedna idempotentna migracja: usuń redundantny trigger, dodaj CHECK zakresu współrzędnych.

### Changes Required:

#### 1. Migracja porządkowo-utwardzająca
**File**: `supabase/migrations/<ts>_invitations_cleanup_and_coord_check.sql`
**Intent**: Usuń zduplikowany stary trigger update i dołóż backstop zakresu lat/lng, by reguła nie żyła wyłącznie w zod.
**Contract**: `drop trigger if exists invitations_guard_update on invitations;` (opcjonalnie `drop function if exists guard_invitation_update();` jeśli nieużywana gdzie indziej — zweryfikować grep). `alter table invitations add constraint invitations_coord_range check ((location_lat is null or location_lat between -90 and 90) and (location_lng is null or location_lng between -180 and 180));` Idempotentne (`if exists` / `if not exists`-równoważnik dla constraintu przez guard w `do $$`). Nie rusza `enforce_invitation_update` ani RLS.

### Success Criteria:
#### Automated Verification:
- Migracja aplikuje się czysto na świeżej bazie: `supabase db reset` (lub CI DB job) / wklejenie do SQL editora bez błędu.
- Re-aplikacja nie rzuca (idempotencja).
- Suite zielony: `npm run test`
#### Manual Verification:
- `\d invitations` pokazuje jeden trigger update (`invitations_enforce_update`) i nowy constraint.
- Bezpośredni insert z lat=999 odrzucony przez CHECK.

**Implementation Note**: Zatrzymaj się na potwierdzenie manualne przed fazą 4.

---

## Phase 4: Testy kluczowych invariantów

### Overview
Dowiedź testami 5 invariantów bez pokrycia + jednostkowo funkcję przejścia.

### Changes Required:

#### 1. Unit modelu domeny
**File**: `tests/unit/invitation-domain.test.ts`
**Intent**: Pokryj czystą funkcję przejścia i predykaty.
**Contract**: `respond("pending","accepted")==="accepted"`; `respond("accepted",*)` rzuca; `canRespond` zgodny. Bez Supabase.

#### 2. Integracja invariantów DB/serwis
**File**: `tests/integration/invitation-invariants.test.ts` (lub rozszerzenie istniejących)
**Intent**: Pokryj duplikat-pending, własność psa, self-invite, odmowę update przez nie-receivera, przeszłą datę.
**Contract**: Asercje: drugi pending dla `(sender,receiver,type)` odrzucony (23505); `sendInvitation` z cudzym `dog_id` rzuca „Invalid dog selection"; insert z `sender_id===receiver_id` odrzucony przez CHECK `invitations_not_self`; update przez użytkownika ≠ receiver nie zmienia wiersza (RLS); zod odrzuca `scheduled_at` w przeszłości. Wzór: `tests/integration/consent-rls.test.ts`.

### Success Criteria:
#### Automated Verification:
- Nowe testy przechodzą i są w suite: `npm run test`
- Testy RED bez zmian z faz 1-3 (dowód, że coś sprawdzają) — zweryfikowane lokalnie przy pisaniu.
#### Manual Verification:
- Przegląd: każdy z 5 invariantów ma nazwany, czytelny test mapujący się na regułę z research.

**Implementation Note**: Zatrzymaj się na potwierdzenie manualne przed fazą 5.

---

## Phase 5: Notatki DDD (artefakt L5)

### Overview
Spisz model domeny jako notatki DDD w `context/domain/` — artefakt odznaki 10xArchitect.

### Changes Required:

#### 1. Folder domenowy + notatka zaproszeń
**File**: `context/domain/README.md`, `context/domain/invitation.md`
**Intent**: Udokumentuj agregat `Invitation`, ubikwistyczny język, zdarzenia, invarianty i granice kontekstu — tak, by było TWOJE i obronne.
**Contract**: `invitation.md` zawiera: ubikwistyczny język (sender/receiver/pending/accepted/declined/meeting), agregat `Invitation` i jego invarianty z mapą warstw (odwołanie do `research.md`), zdarzenia domenowe, granicę kontekstu (gdzie kończy się zaproszenie a zaczyna pack/messaging), oraz świadome decyzje (meeting-jako-widok, type pod S-08). `README.md` wyjaśnia cel folderu i linkuje mapę repo + research.

### Success Criteria:
#### Automated Verification:
- Pliki istnieją: `test -f context/domain/invitation.md && test -f context/domain/README.md`
- Markdown bez błędów formatowania: `npm run format` (prettier) czysty.
#### Manual Verification:
- Notatka spójna z kodem po fazach 1-4 (stany/zdarzenia/invarianty odpowiadają modułowi domeny).
- Dwustronicowy raport odznaki może cytować ten plik jako artefakt L5.

**Implementation Note**: Finalna faza — po niej zmiana gotowa do złożenia w raporcie Architekta.

---

## Testing Strategy

### Unit Tests:
- Funkcja przejścia `respond()` + `canRespond()` (legalne/nielegalne przejścia).

### Integration Tests:
- 5 invariantów (duplikat-pending, własność psa, self-invite, odmowa nie-receivera, przeszła data) na zdalnym test-Supabase (wzór `consent-rls.test.ts`).

### Manual Testing Steps:
1. Preview build: wyślij zaproszenie, potem drugie do tej samej osoby → przyjazny 409/komunikat.
2. Zaakceptuj zaproszenie, spróbuj odpowiedzieć ponownie → czytelny błąd „no longer pending".
3. Bezpośredni insert lat=999 w SQL editorze → odrzucony przez CHECK.

## Migration Notes

Migracja fazy 3 jest czysto porządkowo-utwardzająca: usuwa zduplikowany trigger (zachowanie bez zmian — `enforce_invitation_update` nadal egzekwuje) i dodaje CHECK pokrywający tylko nowe nielegalne wartości. Istniejące wiersze z `location_lat/lng = null` lub w zakresie pozostają ważne. Przed DROP funkcji `guard_invitation_update` zweryfikuj grepem, że nie jest używana przez inny trigger.

## References
- Research: `context/changes/walk-invitations-architecture/research.md`
- Mapa repo (strefa ryzyka #2): `context/map/repo-map.md`
- Wzór migracji/RLS: `supabase/migrations/20261014090001_harden_consent_rls.sql`
- Wzór testów invariantów: `tests/integration/consent-rls.test.ts`
- Serwis: `src/lib/services/invitation.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Model domeny

#### Automated
- [ ] 1.1 Typecheck przechodzi: `npx astro check`
- [ ] 1.2 Lint przechodzi: `npm run lint`
- [ ] 1.3 Istniejący suite zielony: `npm run test`

#### Manual
- [ ] 1.4 Brak pozostałych literałów statusów poza modułem domeny (grep)

### Phase 2: Invarianty serwis/API

#### Automated
- [ ] 2.1 Lint + typecheck czyste: `npm run lint` && `npx astro check`
- [ ] 2.2 Suite zielony: `npm run test`

#### Manual
- [ ] 2.3 Drugi pending zwraca przyjazny komunikat/409, nie 500
- [ ] 2.4 Odpowiedź na zaakceptowane daje czytelny błąd, nie surowy DB

### Phase 3: Backstop DB

#### Automated
- [ ] 3.1 Migracja aplikuje się czysto na świeżej bazie
- [ ] 3.2 Re-aplikacja nie rzuca (idempotencja)
- [ ] 3.3 Suite zielony: `npm run test`

#### Manual
- [ ] 3.4 Jeden trigger update + nowy constraint widoczne w `\d invitations`
- [ ] 3.5 Insert z lat=999 odrzucony przez CHECK

### Phase 4: Testy kluczowych invariantów

#### Automated
- [ ] 4.1 Nowe testy przechodzą i są w suite: `npm run test`
- [ ] 4.2 Testy RED bez zmian z faz 1-3 (zweryfikowane przy pisaniu)

#### Manual
- [ ] 4.3 Każdy z 5 invariantów ma nazwany test mapujący regułę z research

### Phase 5: Notatki DDD (artefakt L5)

#### Automated
- [ ] 5.1 Pliki istnieją: `context/domain/invitation.md` + `README.md`
- [ ] 5.2 Prettier czysty: `npm run format`

#### Manual
- [ ] 5.3 Notatka spójna z kodem po fazach 1-4
- [ ] 5.4 Raport odznaki może cytować plik jako artefakt L5
