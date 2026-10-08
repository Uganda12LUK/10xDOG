# Meeting Form — Plan Brief

> Full plan: `context/changes/ui-meeting-form/plan.md`
> Research: `context/changes/ui-meeting-form/research.md`

## What & Why

Tworzymy stronę `/meetings/new` z formularzem propozycji spotkania zastępującym prymitywny one-click przycisk na stronie właściciela. Użytkownik może wybrać typ (spacer/hodowla), wskazać psa i podać datę — informacje, których obecna wersja w ogóle nie zbiera.

## Starting Point

`/meetings/new` nie istnieje (FAB na `/meetings` kieruje na 404). Strona `/owners/[id].astro` ma hardcoded przycisk wysyłający zaproszenie z `type="walk"` bez żadnego wyboru. API `POST /api/invitations` obsługuje tylko `receiver_id` + `type`.

## Desired End State

Użytkownik klika "Zaproponuj spotkanie" na stronie właściciela, trafia na formularz z mapą, wybiera typ/psa/datę i wysyła zaproszenie. Po sukcesie widzi nowe zaproszenie w zakładce Propozycje na `/meetings`.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Odbiorca (receiver) | `?receiver_id=` z URL | Formularz jest zawsze kontekstualny — otwierany z profilu właściciela | Research |
| Mini mapa | Statyczny pin Leaflet w centrum miasta | Brak lat/lng w schemacie; mapa dekoracyjna z `CITY_CENTERS` | Research/User |
| Pola formularza | Typ + pies + data/czas | Użytkownik chce pełnego formularza; wymaga 2 migracji | User |
| Post-submit redirect | `/meetings` | Spójna UX — widać nowe zaproszenie od razu w zakładce Propozycje | User |
| Leaflet hydration | `client:only="react"` | Leaflet importuje CSS na poziomie modułu, brak SSR guard | Research |

## Scope

**In scope:**
- Migracja: `dog_id` (FK nullable) + `scheduled_at` (timestamptz nullable) w tabeli `invitations`
- Rozszerzenie `Invitation` type, `InvitationRow`, `mapRow`, `sendInvitation`
- Rozszerzenie `POST /api/invitations` + redirect → `/meetings`
- Nowy `MeetingForm.tsx` (type radio, dog chips, datetime, static Leaflet map)
- Nowa strona `src/pages/meetings/new.astro`
- Aktualizacja `/owners/[id].astro` — replace one-click button with form link

**Out of scope:**
- Picker właściciela w formularzu
- Interaktywna mapa do wyboru miejsca (brak lat/lng w schemacie)
- Walidacja daty w przeszłości
- Edycja lub anulowanie zaproszenia

## Architecture / Approach

SSR strona pobiera profil odbiorcy i psy użytkownika równolegle (`Promise.all`), przekazuje jako propsy do React island `<MeetingForm client:only="react" />`. Formularz wysyła natywny POST do `/api/invitations` (extended). API -> `sendInvitation(supabase, senderId, receiverId, type, dogId, scheduledAt)` → redirect `/meetings`.

## Phases at a Glance

| Phase | Co dostarcza | Główne ryzyko |
|---|---|---|
| 1. Schema, Types, Service | 2 migracje SQL + aktualizacja Invitation type + serwis | Migracja musi działać na istniejących danych (NULL w nowych polach) |
| 2. API Extension | `dog_id`/`scheduled_at` w endpoincie, redirect → `/meetings` | Zod `nullish()` dla UUID — testować z i bez pola |
| 3. MeetingForm | React island: radio, chipy, datetime, Leaflet pin | Leaflet wymaga `client:only`; pin emoji może nie renderować się na starszych urządzeniach |
| 4. Page + Integration | `/meetings/new.astro` + aktualizacja `/owners/[id]` | Brak `receiver_id` → redirect; receiver not found → graceful error |

**Prerequisites:** ui-meetings-tabs (implemented ✓), ui-owners-map (implemented ✓)
**Estimated effort:** ~1-2 sesje, 4 fazy

## Open Risks & Assumptions

- `CITY_CENTERS` w `DogMap.tsx` zawiera skończoną listę miast — profile z innym miastem dostaną pin w Warszawie (fallback).
- `<input type="datetime-local">` wysyła format bez strefy czasowej — Postgres interpretuje w strefie serwera. Dla MVP polskiego rynku akceptowalne.

## Success Criteria (Summary)

- Kliknięcie "Zaproponuj spotkanie" z profilu właściciela otwiera formularz z mapą, polami typ/pies/data
- Wypełnienie i wysłanie formularza tworzy zaproszenie widoczne w `/meetings` → zakładka Propozycje
- `/meetings/new` bez `receiver_id` nie rzuca błędu — przekierowuje na `/owners`
