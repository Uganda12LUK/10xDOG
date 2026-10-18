# Słownik języka ubikwistycznego PawMeet (Ubiquitous Language)

> Artefakt DDD M4L5. Jeden termin = jedno znaczenie w kodzie, UI i rozmowie. Gdy nazwa
> w bazie różni się od nazwy domenowej, zapisujemy to jako **szew tłumaczenia** (ACL) —
> patrz [[03-anti-corruption-layer]]. Dowody: `src/types.ts`, `src/lib/services/*`,
> `supabase/migrations/*`.

## Aktorzy i tożsamość

| Termin | Znaczenie | Dowód / uwaga |
|---|---|---|
| **Owner (właściciel)** | Zalogowany użytkownik; podmiot wszystkich działań. Tożsamość = `auth.uid()`. | `middleware.ts` → `locals.user`; wiersz `profiles.id = auth user id` |
| **Profile (profil)** | Publiczna tożsamość właściciela widoczna dla innych zalogowanych. | `Profile` `types.ts:6` — `name, city, avatar*`; **bez** ulicy/GPS |
| **Public profile** | Węższy kształt profilu bezpieczny do pokazania obcemu (omija nawet znaczniki czasu). | `PublicProfile` `types.ts:27`; seam `getPublicProfile` |
| **Owner location (lokalizacja prywatna)** | Ulica + GPS właściciela; czytelna **wyłącznie dla niego**. | `OwnerLocation` `types.ts:18`; tabela `profile_locations` owner-only RLS |

## Psy i dopasowanie

| Termin | Znaczenie | Dowód / uwaga |
|---|---|---|
| **Dog (pies)** | Profil psa należący do właściciela; to, co dopasowujemy. | `Dog` `types.ts:44`; `create_dogs.sql` |
| **Traits / size / breed** | Atrybuty psa używane w filtrowaniu. | `dogAttributes.ts`, `breeds.ts`; filtr w `dogFilter.ts` |
| **Discovery (odkrywanie)** | Znajdowanie innych właścicieli/psów w promieniu, z filtrem cech. | `dogFilter.ts`, `listOwners` |
| **Discoverable radius** | Promień geograficzny liczony **serwerowo**; współrzędne nie opuszczają bazy. | RPC `discoverable_owner_ids()` SECURITY DEFINER, `DISCOVERY_RADIUS_KM` |

## Zaproszenia i spotkania (rdzeń)

| Termin | Znaczenie | Dowód / uwaga |
|---|---|---|
| **Invitation (zaproszenie)** | Propozycja spotkania; agregat rdzenia. | `Invitation` `types.ts:69`; `invitation.ts` |
| **Sender / Receiver** | Inicjujący / odbierający. **Tylko Receiver** może odpowiedzieć. | `respondToInvitation` `.eq('receiver_id', userId)` |
| **Type** | Rodzaj zaproszenia: `walk` (MVP) lub `breeding` (scaffold). | `types.ts:73` |
| **Status** | Stan maszyny: `pending` → `accepted` \| `declined`. Terminalny = ostateczny. | `create_invitations.sql` CHECK; [[invitation.md]] |
| **Walk (spacer)** | Domyślny, jedyny realny `type`. Breeding nie ma przepływu. | — |
| **Meeting (spotkanie)** | **Nie osobna encja**: to zaakceptowane zaproszenie (`status='accepted'`). | `listAcceptedMeetings` |
| **Pending guard** | Najwyżej jedno oczekujące zaproszenie na `(sender, receiver, type)`. | DB partial unique index; `hasPendingInvitation` |

## Pack i wiadomości

| Termin | Znaczenie | Dowód / uwaga |
|---|---|---|
| **Pack (sfora)** | Zbiór zaakceptowanych połączeń właściciela — jego „grupa psów". | `pack.ts`; `PackMember` `types.ts:106` |
| **Pack connection** | Krawędź zgody między dwoma właścicielami; bliźniacza maszyna do Invitation. | `PackConnection` `types.ts:92`; `create_pack_connections.sql` |
| **Requester / Addressee** | Role w pack connection (odpowiednik Sender/Receiver). | `types.ts:93-94` |
| **Throw a bone / catch (rzuć kość)** | UI-metafora wysłania/przyjęcia pack request. | `PackStatus` `types.ts:103`; e2e „A throws a bone, B catches it" |
| **Pack status** | Relacja widza do innego właściciela: `none` / `pending_out` / `pending_in` / `accepted`. | `types.ts:103` |
| **Message (wiadomość)** | Czat 1:1, **odblokowany dopiero gdy obaj są w packu**. | `chat.ts`; bramka `are_in_pack` |

## Szwy nazewnicze (DB ≠ domena) — pełny opis w [[03-anti-corruption-layer]]

| W domenie / kodzie | W bazie | Uwaga |
|---|---|---|
| **street** | kolumna `district` | świadomy alias; `mapOwnLocation` tłumaczy `district → street` |
| `senderId`, `receiverId`, `dogId`… (camelCase) | `sender_id`, `receiver_id`, `dog_id` (snake_case) | mappery `mapRow` w serwisach |
| **Meeting** | brak tabeli | widok nad `invitations WHERE status='accepted'` |
| **breeding** | wartość `type='breeding'` | termin z PRD, **bez** przepływu — backlog, nie model |

## Terminy świadomie NIEobecne w modelu

- **cancelled / re-open** — brak; stany terminalne są ostateczne (decyzja S-04/S-05).
- **Meeting jako encja** — brak; spotkanie to odczyt, nie byt (dług świadomy).
- **breeding flow** — brak; tylko scaffold schematu.
