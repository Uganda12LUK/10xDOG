# Kontekst domenowy: Zaproszenia na spacer (Invitation)

> Notatka DDD dla zdolności **walk-invitations** — strefa ryzyka #2 mapy repo.
> Źródła dowodowe: `context/changes/walk-invitations-architecture/research.md`
> (HEAD 32daad6), `src/lib/services/invitation.ts`, `supabase/migrations/*invitation*`,
> `20261014090001_harden_consent_rls.sql`, `src/types.ts:69-81`.

## Ubikwistyczny język

- **Sender** — właściciel inicjujący zaproszenie (`sender_id`).
- **Receiver** — właściciel otrzymujący; **jedyny**, który może odpowiedzieć (`receiver_id`).
- **Invitation (zaproszenie)** — propozycja spotkania; agregat tej domeny.
- **Type** — rodzaj: `walk` (spacer, MVP) lub `breeding` (hodowla, scaffold pod S-08).
- **Status** — stan maszyny: `pending` → `accepted` | `declined`.
- **Meeting (spotkanie)** — **nie osobna encja**: to zaakceptowane zaproszenie
  (`status = 'accepted'`). „Pokaż spotkania" = czytanie accepted-invitations.
- **Pending guard** — reguła: najwyżej jedno oczekujące zaproszenie na trójkę
  `(sender, receiver, type)`.

## Agregat: Invitation

Korzeń agregatu = wiersz `invitations`. DTO: `src/types.ts:69-81` (camelCase).
Granica transakcyjna obejmuje pojedyncze zaproszenie — brak encji podrzędnych;
`dog_id`, `scheduled_at`, `location_lat/lng` to atrybuty wartości dołączane przy wysłaniu.

### Pola i ich natura
- `id`, `sender_id`, `receiver_id`, `type`, `created_at` — **niezmienne** po utworzeniu.
- `status` — jedyny atrybut mutowalny, i tylko przez przejście `pending → terminal`.
- `dog_id` (FK `ON DELETE SET NULL`), `scheduled_at`, `location_lat/lng` — opcjonalne,
  ustawiane przy wysłaniu (INSERT-only).

## Maszyna stanów (model)

```
          sendInvitation                 respond(accepted)
   (∅) ───────────────▶ pending ───────────────────────▶ accepted  (= meeting)
                           │
                           └──────────────────────────▶ declined
                                 respond(declined)
```

- Stan początkowy: `pending` (DB default).
- Jedyne legalne przejścia: `pending → accepted` oraz `pending → declined`.
- **Stany terminalne są ostateczne** — brak re-open, brak `cancelled` (decyzja settled
  w S-04/S-05; `research.md` § Historical Context).
- Przejście wykonuje **wyłącznie receiver**.

Docelowo (plan L4, faza 1) model jest skodyfikowany jako czysta funkcja przejścia
`respond(current, action)` w `src/lib/domain/invitation.ts` — lustro reguł DB, nie nowy
autorytet. Dziś stany to rozsiane literały w SQL/TS/zod (dług do spłaty — patrz plan).

## Invarianty i gdzie są egzekwowane

Mapa warstw (pełna tabela: `research.md` § Invariant → warstwa):

| Invariant | Egzekwowane w | Uwaga |
|---|---|---|
| Stany ∈ {pending, accepted, declined} | DB CHECK | `create_invitations.sql:9` |
| sender ≠ receiver | DB CHECK `invitations_not_self` | — |
| ≤1 pending per (sender, receiver, type) | DB partial unique index | jedyny realny guard zapisu |
| insert tylko jako `pending` | DB RLS + trigger | `harden:70` |
| tylko receiver odpowiada | **DB RLS + serwis** (defense-in-depth) | `harden:72-78` + serwis `.eq` |
| respond tylko gdy `old.status = pending` | DB RLS `status='pending'` + trigger `old.status<>'pending'` | `harden:77,91-92` |
| niezmienność sender/receiver/type | DB trigger `enforce_invitation_update` | `harden:85-89` |
| własność psa (dog.owner == sender) | **tylko serwis** | FK dowodzi istnienia, nie własności (`invitation.ts:48-53`) |
| `scheduled_at` nie w przeszłości | **tylko zod/API** | reguła względem `now()` — nie wyrażalna CHECK-iem |
| zakres lat/lng | zod/API (+ planowany DB CHECK, faza 3) | — |

**Świadome decyzje architektoniczne:**
- *Meeting jako widok, nie encja* — upraszcza schemat kosztem zmieszania dwóch pojęć
  (zaproszenie vs spotkanie) w jednym wierszu.
- *`type='breeding'` scaffoldowany* od początku, by S-08 nie wymagał migracji.
- *DB-first* — najmocniejsze invarianty w bazie (RLS + triggery), serwis cienki.

## Zdarzenia domenowe

Dziś niejawne; docelowo (plan) jako typy w module domeny:
- **InvitationSent** — powstało `pending` zaproszenie (`sendInvitation`).
- **InvitationAccepted** — `pending → accepted`; materializuje wspólne *meeting*.
- **InvitationDeclined** — `pending → declined`.

Brak audytu/historii przejść poza znacznikiem `updated_at` (zidentyfikowane w research
jako luka obserwowalności — poza zakresem bieżącego planu).

## Granice kontekstu (context boundaries)

- **W górę:** zaproszenie startuje z profilu właściciela na mapie
  (`map/[id].astro`, `OwnerProfile.astro`) — kontekst *map-location*/*owner-profile*
  dostarcza receivera; *dog-profiles* dostarcza `dog_id` (z guardem własności).
- **W dół:** zaakceptowane zaproszenie bywa punktem wejścia do *messaging* (czat),
  ale czat jest bramkowany przez *pack-connections* (`are_in_pack`), nie przez samo
  zaproszenie — to osobny kontekst zgody.
- **Sąsiedni, nie wspólny:** *pack-connections* ma własną, bliźniaczą maszynę stanów
  (`enforce_pack_connection_update`) — ten sam wzorzec consent, inny agregat. Nie
  współdzielić stanu; współdzielić można wzorzec (kandydat na wspólny język domeny).

## Otwarte wątki domenowe (do dalszych notatek)

1. Czy wyodrębnić wspólny wzorzec „consent state machine" dla Invitation i PackConnection?
2. Czy *Meeting* zasługuje na własny agregat, gdy dojdzie planowanie/odwoływanie spotkań?
3. Model zdarzeń + audyt przejść (obserwowalność) jako osobny kontekst.
