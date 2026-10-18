# Invarianty, agregaty i refaktor maszyny zgody

> Artefakt DDD M4L5. Co to są agregaty PawMeet, jakie reguły muszą być zawsze
> prawdziwe, gdzie są egzekwowane — i jaki **refaktor** proponujemy, by rdzeń
> (maszyny zgody) miał jeden jawny model zamiast rozsianych literałów.
> Dowody: `src/types.ts`, `src/lib/services/*`, `supabase/migrations/*`,
> plan L4 `context/changes/walk-invitations-architecture/plan.md` (+ `plan-brief.md`).
> **Uwaga:** opisany refaktor to PLAN (artefakt odznaki) — NIE jest zaimplementowany.

## Agregaty i ich granice

| Agregat | Korzeń | Granica transakcyjna | Dowód |
|---|---|---|---|
| **Invitation** | wiersz `invitations` | pojedyncze zaproszenie; brak encji podrzędnych | `types.ts:69`, `invitation.ts`; pełny opis [[invitation.md]] |
| **PackConnection** | wiersz `pack_connections` | pojedyncze połączenie | `types.ts:92`, `pack.ts` |
| **Profile + OwnerLocation** | `profiles` (+ satelita `profile_locations`) | profil publiczny i prywatna lokalizacja = **dwa wiersze, jeden właściciel**; granica prywatności biegnie między nimi | `profile.ts`, migracja `profile_private_location` |
| **Dog** | wiersz `dogs` | pojedynczy pies; `owner_id` wiąże z właścicielem | `types.ts:44`, `dog.ts` |

`Meeting` **nie jest** agregatem — to odczyt `invitations WHERE status='accepted'` (świadoma
decyzja, [[glossary]]). `Message` to byt generyczny poza rdzeniem.

## Invarianty i gdzie są egzekwowane (defense-in-depth)

Rdzeniowa zasada PawMeet: **najmocniejsze reguły w bazie (RLS + triggery + constrainty);
serwis cienki, dokłada tylko to, czego baza nie wyrazi.**

### Invitation (pełna tabela: [[invitation.md]] § Invarianty)

| Invariant | Egzekwowane w | Uwaga |
|---|---|---|
| `status ∈ {pending, accepted, declined}` | DB CHECK | `create_invitations.sql` |
| `sender ≠ receiver` | DB CHECK `invitations_not_self` | — |
| ≤1 pending per `(sender, receiver, type)` | DB partial unique index | jedyny realny guard zapisu; `hasPendingInvitation` to tylko UX |
| insert tylko jako `pending` | DB RLS + trigger | `harden_consent_rls` |
| **tylko receiver odpowiada** | DB RLS + serwis (`.eq('receiver_id', userId)`) | defense-in-depth; `invitation.ts:160` |
| respond tylko gdy `old.status='pending'` | DB RLS + trigger | zamraża stan terminalny |
| niezmienność `sender/receiver/type` | DB trigger `enforce_invitation_update` | — |
| **własność psa** (`dog.owner == sender`) | **tylko serwis** | FK dowodzi istnienia, nie własności; `invitation.ts:46-53` |
| `scheduled_at` nie w przeszłości | **tylko zod/API** | reguła względem `now()` — nie wyrażalna CHECK-iem |

### PackConnection (bliźniacza maszyna)

Ten sam kształt: `pending → accepted|declined`, terminalny=ostateczny, odpowiada tylko
`addressee`, niezmienność uczestników przez `enforce_pack_connection_update`. **Osobny
agregat, osobny trigger — współdzielimy wzorzec, nie stan** ([[01-domain-distillation]]).

### Prywatność lokalizacji (invariant bezpieczeństwa ponad agregatami)

`OwnerLocation` czytelna **wyłącznie dla właściciela** (owner-only RLS na
`profile_locations`); obcy odczyt nigdy nie widzi ulicy/GPS. Egzekucja: RLS + oddzielny
szew odczytu `getPublicProfile` → [[03-anti-corruption-layer]].

## Zapach: invariant w jednej warstwie i rozsiane literały

Dziś stany zaproszenia to literały `'pending'`/`'accepted'`/`'declined'` powtórzone w
SQL, w `types.ts`, w zod i w serwisie. Dwa invarianty żyją tylko w jednej warstwie
(własność psa — serwis; `scheduled_at` — zod). Współistnieją **dwa** triggery update
(stary nieusunięty). Duplikat-pending wychodzi jako surowy 500. Źródło: `plan-brief.md`
§ Starting Point.

## Proponowany refaktor (plan L4 — NIE zaimplementowany)

Cel: jeden jawny, testowalny model, który jest **lustrem** reguł DB, nie nowym autorytetem.

1. **Moduł domeny** `src/lib/domain/invitation.ts`: typ stanów + czysta funkcja przejścia
   `respond(current, action)` + typy zdarzeń (`InvitationSent/Accepted/Declined`). Serwis,
   zod i `types.ts` konsumują ten moduł — koniec z literałami.
2. **Serwis/API**: invariant „respond tylko gdy pending" także w serwisie; duplikat-pending
   mapowany na przyjazny **409** (kod Postgresa `23505`), nie 500.
3. **Backstop DB**: jedna migracja — DROP redundantnego triggera + CHECK zakresu lat/lng.
4. **Testy**: unit funkcji przejścia + 5 brakujących invariantów integracyjnie.

**Świadomie poza zakresem:** pełny agregat z repozytorium/ORM, osobna tabela `meetings`,
flow breeding, CHECK na `scheduled_at`. Right-sized wobec konwencji cienkich serwisów.

**Kandydat na wspólny język:** wyekstrahować wzorzec „consent state machine" współdzielony
przez `Invitation` i `PackConnection` — otwarty wątek [[invitation.md]] § Otwarte wątki.
