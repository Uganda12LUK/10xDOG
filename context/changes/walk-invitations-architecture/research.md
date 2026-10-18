---
date: 2026-10-16T19:10:36+0200
researcher: lmajers
git_commit: 32daad6323f24cd4434079e40106ebb700117d1a
branch: feat/discovery-location-tweaks
repository: Lekcja_1_DOGFB (PawMeet)
topic: "Architektura maszyny stanów zaproszeń na spacer — stany, przejścia, invarianty i gdzie są egzekwowane"
tags: [research, codebase, walk-invitations, state-machine, rls, ddd]
status: complete
last_updated: 2026-10-16
last_updated_by: lmajers
---

# Research: Architektura maszyny stanów zaproszeń na spacer

**Date**: 2026-10-16T19:10:36+0200
**Researcher**: lmajers
**Git Commit**: 32daad6323f24cd4434079e40106ebb700117d1a
**Branch**: feat/discovery-location-tweaks
**Repository**: Lekcja_1_DOGFB (PawMeet)

## Research Question

Jak dziś działa maszyna stanów zaproszeń na spacer — jakie są stany, dozwolone przejścia, invarianty i w której warstwie (DB / serwis / API) każdy z nich jest egzekwowany — aby napisać plan refaktoryzacji (L4) i notatki domenowe DDD (L5) dla odznaki 10xArchitect.

## Summary

Zaproszenie (`invitations`) to tabela pełniąca rolę maszyny stanów z 3 stanami: `pending` (domyślny), `accepted`, `declined`. Jedyne dozwolone przejście to `pending → accepted | declined`; brak stanu „cancelled" i brak re-open — decyzja jest ostateczna. „Spotkanie" nie ma osobnej tabeli: to po prostu wiersz `invitations` ze `status = 'accepted'` (`src/lib/services/invitation.ts:135-148`). Kolumna `type ('walk'|'breeding')` jest scaffoldowana pod przyszły flow hodowlany (S-08), ale UI obsługuje tylko „walk".

Invarianty są rozłożone na trzy warstwy, z wyraźnie niejednolitą dyscypliną:
- **DB (najsilniejsza):** CHECK na `type`/`status`, `sender_id <> receiver_id`, partial unique index na jedno `pending` per `(sender, receiver, type)`, RLS per-operacja, oraz trigger `enforce_invitation_update()` pilnujący niezmienności uczestników/typu i legalnego przejścia `pending → terminal` (widzi `OLD`).
- **Serwis:** jedyny właściciel guard-u własności psa (`dog.ownerId === senderId`) — FK dowodzi tylko istnienia psa, nie własności.
- **API (zod):** jedyny właściciel reguł `scheduled_at` nie-w-przeszłości oraz zakresu lat/lng. DB nie ma tu żadnego CHECK — zapis z pominięciem API je obchodzi.

Kluczowe sprostowanie względem wstępnych dowodów: blokada „respond tylko gdy pending / stany terminalne są ostateczne" **jest** egzekwowana (RLS `using status='pending'` w `20261014090001_harden_consent_rls.sql:77` + trigger `old.status <> 'pending'` w `:91-92`) — to nie jest luka. Realne słabości to: (1) dwa współistniejące triggery update (stary `guard_invitation_update` nie został usunięty), (2) invarianty jednowarstwowe (własność psa tylko w serwisie; reguły daty/współrzędnych tylko w zod), (3) brak pre-czeku duplikatu w POST (surowy błąd Postgresa → 500), (4) pokaźne luki testowe na egzekwowanych invariantach.

## Detailed Findings

### Model stanów i przejść

- Stany `pending | accepted | declined` — CHECK + default `pending`: `supabase/migrations/20260926090001_create_invitations.sql:9`.
- Brak stanu „cancelled" i brak re-open — decyzja settled w S-04/S-05: `context/archive/2026-09-26-walk-invitation-loop/plan.md:57-58`, `context/archive/2026-09-26-scheduled-meetings-view/plan.md:39`.
- „Spotkanie" = `invitations` ze `status='accepted'`; brak osobnej tabeli; `listAcceptedMeetings` OR-filtruje obu uczestników po `updated_at` (= czas akceptacji): `src/lib/services/invitation.ts:135-148`.
- Typ `walk|breeding` scaffoldowany pod S-08 bez migracji: `20260926090001_create_invitations.sql:8`; rationale `walk-invitation-loop/plan.md:86-89`. UI etykietuje głównie „walk" (`src/lib/i18n/en.ts:44-45`).

### Warstwa serwisu (`src/lib/services/invitation.ts`)

- `sendInvitation` (`:36-73`) — insert; guard własności psa `if (dog?.ownerId !== senderId) throw "Invalid dog selection"` (`:48-53`). Status nie jest ustawiany (DB default `pending`).
- `respondToInvitation` (`:150-168`) — `update({ status }).eq("id").eq("receiver_id", userId)`. **Nie** filtruje `.eq("status","pending")` — na terminalnym wierszu polega wyłącznie na DB (RLS + trigger), które zwrócą brak wiersza/błąd.
- Zapytania odczytu: `listReceivedPending` (`:94-106`), `listSentPending` (`:108-120`), `countReceivedPending` (`:122-133`), `listAcceptedMeetings` (`:135-148`), `hasPendingInvitation` (`:75-92`).
- Statusy jako literały stringowe rozsiane po zapytaniach (`"pending"`/`"accepted"` w `:85,99,113,127,141`) — brak współdzielonej stałej/enuma.

### Warstwa API

- `POST /api/invitations` (`src/pages/api/invitations/index.ts:27-91`): zod waliduje `receiver_id`, `type` enum, `dog_id`, `scheduled_at` (refine: poprawna data i `>= Date.now()`, `:12-22`), `location_lat/lng` zakres (`:23-24`). Woła `sendInvitation` (`:69`). Błąd serwera zwraca **500 JSON** (nie flatten do 302) — `:84-88`; loguje przyczynę do stdout Workers bez PII (`:74-80`).
- `POST /api/invitations/respond` (`src/pages/api/invitations/respond.ts:13-62`): zod `{invitationId, action: accepted|declined}` (`:8-11`); 503 bez Supabase, 401 bez usera, 400 zły JSON/input, woła `respondToInvitation` (`:51`), sukces 200.
- `hasPendingInvitation` jest wołany tylko przy renderze strony profilu (`src/pages/map/[id].astro:29`) do wyszarzenia przycisku — **nie** w ścieżce POST, więc nie jest realnym guardem zapisu.

### Warstwa DB — invarianty

- Tabela + RLS: `20260926090001_create_invitations.sql`. Partial unique index `invitations_no_duplicate_pending` na `(sender_id, receiver_id, type) where status='pending'` (`:22-24`). CHECK `invitations_not_self` (`:12`). RLS select-participant (`:36-40`), insert-own (`:43-47`), update-receiver (`:50-55`).
- Kolumny dodane później, wszystkie **nullable, bez CHECK**: `dog_id` (FK `ON DELETE SET NULL`) + `scheduled_at` w `20260928090001_add_dog_scheduled_to_invitations.sql:1-3`; `location_lat/lng double precision` w `20261004090001_add_location_to_invitations.sql:5-7`. Żadnego nowego indeksu/constraintu.
- Hardening `20261014090001_harden_consent_rls.sql`: INSERT wymaga `status='pending'` (`:70`); UPDATE `using (receiver_id=auth.uid() and status='pending')` + `with check (status in ('accepted','declined'))` (`:72-78`); nowy trigger `enforce_invitation_update()` pilnuje niezmienności `sender_id/receiver_id/type` i `old.status <> 'pending'` + `new.status in (accepted,declined)` (`:80-105`). Rationale (bypass consent/ re-open) w nagłówku `:1-11`.

### Invariant → warstwa egzekwowania

| Invariant | DB | Serwis | API (zod) | Kotwica |
|---|---|---|---|---|
| `type ∈ {walk,breeding}` | CHECK | — | enum | `create:8` / `index.ts:10` |
| `status ∈ {pending,accepted,declined}` | CHECK + default | — | — | `create:9` |
| sender ≠ receiver | CHECK | — | — | `create:12` |
| ≤1 pending per (sender,receiver,type) | **partial unique index (jedyny realny guard zapisu)** | `hasPendingInvitation` tylko UI-advisory | — | `create:22-24`; serwis `75-92` |
| insert tylko jako `pending` | RLS insert + trigger | — | — | `harden:70` |
| sender = auth user (insert) | RLS `with check` | przekazuje `user.id` | `user.id` | `harden:70`; `index.ts:40,69` |
| tylko uczestnik czyta | RLS select | `.eq/.or` | — | `create:36-40` |
| tylko receiver update | RLS using+check | `.eq("receiver_id")` | — | `harden:72-78`; serwis `160` |
| respond tylko gdy `old.status=pending` (stany terminalne ostateczne) | **RLS `using status='pending'` + trigger `old.status<>'pending'`** | — (brak `.eq status`) | — | `harden:77,91-92` |
| niezmienność sender/receiver/type | trigger | serwis ustawia tylko `status` | — | `harden:85-89` |
| własność psa (dog.owner==sender) | — (FK tylko istnienie) | **jedyny guard** | — | serwis `48-53` |
| `scheduled_at` obecne + nie w przeszłości | — | — | **jedyny guard** (refine) | `index.ts:12-22` |
| lat/lng w zakresie | — | — | **jedyny guard** | `index.ts:23-24` |
| `updated_at` auto-bump | trigger `set_updated_at` | — | — | `create:27-30` |

### Pokrycie testami (i luki)

Obecne: `tests/integration/consent-rls.test.ts` (insert-as-accepted odrzucony `:54-59`; receiver nie przepisze uczestnika `:99-112`; wiersz terminalny zamrożony `:114-121`; legalny `pending→accepted` `:123-127`). `tests/integration/invitation-state-machine.test.ts` (inbox/`listAcceptedMeetings` dla pending/declined/accepted `:30-61`). `tests/e2e/invitation-loop.spec.ts` (happy path A→B `:54-120`).

Luki (invarianty bez testu): duplikat-pending (unique index), guard własności psa, self-invite CHECK, niezmienność `type`, odmowa update przez nie-receivera/sendera, insert z cudzym `sender_id`, odrzucenie przeszłej daty (zod), gałęzie 401/400/500 w `respond.ts`.

## Code References

- `src/lib/services/invitation.ts:36-168` — cały serwis maszyny stanów (7 funkcji + `mapRow`).
- `src/pages/api/invitations/index.ts:27-91` — POST send (zod, guard, 500-on-failure).
- `src/pages/api/invitations/respond.ts:13-62` — POST respond (auth/validate/respond).
- `supabase/migrations/20260926090001_create_invitations.sql` — tabela, index, RLS.
- `supabase/migrations/20260926090002_restrict_invitation_status_update.sql` — stary trigger `guard_invitation_update` (patrz Open Questions — redundancja).
- `supabase/migrations/20261014090001_harden_consent_rls.sql:65-105` — obecny trigger `enforce_invitation_update` + zahardenowane RLS.
- `src/types.ts:69-81` — interfejs `Invitation` (camelCase DTO).
- `src/components/meetings/MeetingsView.tsx:66-127` — Inbox accept/decline → `/api/invitations/respond`.
- `src/components/meetings/MeetingForm.tsx:45-183` — formularz propozycji → `/api/invitations`.
- `src/components/Topbar.astro:15,43-45` — badge z `countReceivedPending`.

## Architecture Insights

- **DB-first dyscyplina.** Najmocniejsze invarianty żyją w DB (RLS + triggery + constrainty). Serwis jest cienką warstwą mapującą snake_case↔camelCase (`mapRow`), niemal bez logiki domenowej — jedyny wyjątek to guard własności psa.
- **Defense-in-depth tylko lokalnie.** „Receiver-only update" jest w DWÓCH warstwach (RLS + serwis `.eq`), ale większość invariantów ma dokładnie jednego właściciela, co utrudnia testowanie na poziomie jednostkowym i czyni warstwę serwisu niepełnym modelem domeny.
- **Brak jawnego modelu domeny.** Stany i przejścia to literały stringowe w SQL, TS i zod; nie ma jednego miejsca (enum/typ/funkcja przejścia), które deklaruje „to jest maszyna stanów". To naturalny punkt wyjścia dla notatek DDD (agregat `Invitation`, metoda `respond()`, zdarzenia `InvitationSent/Accepted/Declined`).
- **Meeting jako widok, nie encja.** Brak osobnego agregatu „Meeting" — upraszcza schema, ale miesza dwa pojęcia domenowe (zaproszenie vs spotkanie) w jednym wierszu.

## Historical Context (from prior changes)

- `context/archive/2026-09-26-walk-invitation-loop/plan.md:48-50,57-58,86-89,180` — pierwotny model: 3 stany, partial unique index jako guard DB + UI jako warstwa UX, brak cancel, `type` pod S-08, receiver-only przez RLS. UWAGA: ten plan opisuje nieistniejące już `/api/invitations/[id].ts` + `/invitations` — zostały zastąpione przez `respond.ts` + `/meetings`.
- `context/archive/2026-09-26-scheduled-meetings-view/plan.md:8-10,34,39-40,68` — „meeting = accepted invitation"; brak daty w S-05 (dodana później).
- `context/changes/ui-meeting-form/plan.md:17,40,62-66` + `ui-meeting-form/research.md:62-77,98` — dodanie `scheduled_at` (nullable, INSERT-only, naive tz) i lokalizacji jako P1.
- `supabase/migrations/20261014090001_harden_consent_rls.sql:1-11` — rationale hardeningu (bypass consent / re-open terminalnego wiersza).

## Related Research

- `context/changes/ui-meeting-form/research.md` — wcześniejszy research formularza (lokalizacja/scheduled_at).
- `context/map/repo-map.md` — walk-invitations jako strefa ryzyka #2 (28% fixów, jedyny audyt observability).

## Open Questions

1. **Redundantne triggery update.** `20261014090001` tworzy `invitations_enforce_update`, ale nie DROP-uje starego `invitations_guard_update` z `20260926090002`. Oba odpalają się na UPDATE. Czy stary należy usunąć (czysty refactor migracyjny)? — do rozstrzygnięcia w planie L4.
2. **Invarianty jednowarstwowe.** Czy przenieść regułę `scheduled_at`/lat-lng do DB CHECK (backstop) i/lub wyrazić guard własności psa oraz „respond tylko gdy pending" także w serwisie (defense-in-depth + testowalność jednostkowa)?
3. **Model domeny.** Czy wprowadzić jawny typ/enum stanów + funkcję przejścia współdzieloną przez serwis i zod, by usunąć rozsiane literały — kandydat na pierwszy artefakt DDD w `context/domain/`.
4. **Pre-czek duplikatu w POST.** Dziś duplikat `pending` wychodzi jako surowy komunikat Postgresa → 500; czy mapować go na przyjazny 409/redirect?
