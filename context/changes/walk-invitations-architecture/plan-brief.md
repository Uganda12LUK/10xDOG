# Walk-invitations state machine — Plan Brief

> Full plan: `context/changes/walk-invitations-architecture/plan.md`
> Research: `context/changes/walk-invitations-architecture/research.md`

## What & Why

Refaktoryzacja maszyny stanów zaproszeń na spacer — ficzer ze strefy ryzyka #2 mapy repo (28% commitów to fixy, jedyny audyt observability). Dziś stany są rozsianymi literałami, część invariantów żyje w jednej tylko warstwie, a duplikat zaproszenia wychodzi jako surowy 500. Cel: jawny, testowalny model domeny + defense-in-depth + porządek w DB, jako artefakt L4/L5 odznaki 10xArchitect.

## Starting Point

Serwis `src/lib/services/invitation.ts` to cienka warstwa mapująca nad Supabase; najmocniejsze invarianty są w DB (RLS + trigger `enforce_invitation_update` + constrainty). Współistnieją dwa triggery update (stary nie usunięty). Guard własności psa jest tylko w serwisie; reguły `scheduled_at`/lat-lng tylko w zod. Testy pokrywają happy-path i część RLS, ale 5 invariantów nie ma testu.

## Desired End State

Jeden moduł domeny deklaruje stany, przejścia i zdarzenia; serwis i zod go konsumują. Duplikat-pending zwraca przyjazny 409. Jedna migracja usuwa redundantny trigger i dokłada CHECK zakresu współrzędnych. 5 kluczowych invariantów ma testy. `context/domain/invitation.md` dokumentuje agregat `Invitation` — gotowy do cytowania w raporcie Architekta.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Zakres DDD | Lekki model domeny (typ stanów + funkcja przejścia + zdarzenia) | Usuwa literały, testowalne, right-sized wobec konwencji cienkich serwisów | Plan |
| Warstwa DB | DROP redundantnego triggera + CHECK lat/lng | Defense-in-depth i czystość bez ruszania działających reguł | Plan |
| Duplikat-pending | Mapuj na 409/redirect | Lepszy UX i observability, DB zostaje twardym guardem | Plan |
| Zakres testów | 5 kluczowych invariantów + unit przejścia | Dowodzi invariantów — mocny materiał pod odznakę | Plan |
| Wdrożenie | Fazy przyrostowe, zachowujące zachowanie | Bezpieczne w strefie ryzyka #2 | Plan |
| Model stanów | 3 stany, `pending → accepted\|declined`, bez cancel | Settled w S-04/S-05, lustro reguł DB | Research |

## Scope

**In scope:** moduł `src/lib/domain/invitation.ts`; konsumpcja w serwisie/zod/types; invariant „respond tylko gdy pending" w serwisie; mapowanie 409; migracja porządkowo-utwardzająca; testy 5 invariantów + unit; notatki DDD.

**Out of scope:** pełny agregat z repozytorium/ORM; osobna tabela `meetings`; flow hodowlany (S-08); CHECK na `scheduled_at` (reguła względem `now()`); testy gałęzi 401/400/500 `respond.ts`; zmiany UI/i18n.

## Architecture / Approach

Model domeny w TS jest *lustrem* reguł już egzekwowanych w DB (trigger + RLS), nie nowym autorytetem — persystencja zostaje w Supabase. Serwis konsumuje domenę i dokłada defense-in-depth; API mapuje błąd unique-violation (`23505`) na 409. Migracja czyści redundancję i dokłada backstop. Przepływ: domena → serwis/API → DB → testy → notatki.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Model domeny | Typ stanów + `respond()` + zdarzenia; serwis/zod/types konsumują | Subtelna zmiana typowania psuje build |
| 2. Invarianty serwis/API | „respond tylko gdy pending" w serwisie + 409 na duplikat | Zależność od kodu błędu Postgresa |
| 3. Backstop DB | Migracja: drop stary trigger + CHECK lat/lng | Idempotencja / DROP używanej funkcji |
| 4. Testy | Unit przejścia + 5 invariantów integracyjnych | Wymaga zdalnego test-Supabase |
| 5. Notatki DDD | `context/domain/invitation.md` (artefakt L5) | Rozjazd notatek z kodem |

**Prerequisites:** zdalny test-Supabase wpięty (`.env.test` + bundle) dla fazy 4; reszta na lokalnym repo.
**Estimated effort:** ~2-3 sesje, 5 faz, głównie backend + testy.

## Open Risks & Assumptions

- Przed DROP funkcji `guard_invitation_update` trzeba grepem potwierdzić brak innego konsumenta (migracja zakłada, że trigger jest jedynym użyciem).
- Faza 4 zależy od dostępności zdalnego test-Supabase (lokalny Docker zablokowany — patrz pamięć projektu).
- Mapowanie 409 zakłada, że Supabase propaguje `code` błędu Postgresa do klienta JS (do potwierdzenia w fazie 2).

## Success Criteria (Summary)

- `npm run test` zielony po każdej fazie; lint + `astro check` czyste.
- Duplikat zaproszenia daje przyjazny 409, nie 500; powtórna odpowiedź daje czytelny błąd.
- `context/domain/invitation.md` istnieje i jest spójny z modułem domeny — cytowalny jako artefakt L5 odznaki.
