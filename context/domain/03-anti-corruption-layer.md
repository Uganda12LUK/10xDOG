# Warstwa antykorupcyjna (Anti-Corruption Layer)

> Artefakt DDD M4L5. Gdzie PawMeet **tłumaczy** między modelem zewnętrznym (schemat
> Supabase, jego nazwy i kształty wierszy, tożsamość auth) a językiem domeny — tak, by
> słownictwo bazy i cudze modele nie „skaziły" modelu domenowego.
> Dowody: `src/lib/services/{invitation,profile,dog}.ts`, `src/types.ts`,
> `supabase/migrations/*`, `src/middleware.ts`.

PawMeet nie ma ORM-a ani repozytoriów — serwisy są cienką warstwą nad Supabase. Dlatego
ACL jest tu **jawny i mały**: zestaw funkcji mapujących i szwów odczytu, którymi każdy
wiersz przechodzi, zanim stanie się typem domeny. To granica, na której kończy się „świat
Postgresa", a zaczyna język z [[glossary]].

## 1. Szew nazewniczy snake_case → camelCase

Baza mówi `sender_id`, `created_at`, `dog_id`; domena mówi `senderId`, `createdAt`,
`dogId`. Tłumaczą to funkcje `mapRow` w każdym serwisie — żaden `*Row` nie wycieka wyżej.

- `invitation.ts:20` `mapRow(InvitationRow) → Invitation`
- `profile.ts:30` `mapRow(ProfileRow) → Profile`, `profile.ts:165` `mapDogRow`
- Typy `*Row` są **lokalne dla serwisu** (nieeksportowane) — kontrakt domeny to `src/types.ts`.

## 2. Szew pojęciowy: `district` → `street`

Najostrzejszy przykład ACL. Kolumna w DB nazywa się `district` (zaszłość), ale w domenie
i UI mówimy **street**. Tłumaczenie jest jawne i udokumentowane w kodzie:

- `profile.ts:54` `mapOwnLocation`: `{ street: row.district, … }`
- `upsertProfile` zapisuje `district: input.street` (`profile.ts:281`)
- Komentarze w `types.ts:17,46` wprost: „`street` is the app name for the DB `district` column".

Domena nie dziedziczy złej nazwy bazy — ACL ją pochłania w jednym miejscu.

## 3. Szew prywatności: foreign-read seam

Najważniejszy ACL bezpieczeństwa. Model „co może zobaczyć obcy" jest **osobnym typem i
osobnym mapperem**, żeby pełny wiersz profilu nie skaził kształtu publicznego:

- `getPublicProfile` (`profile.ts:104`) selektuje **jawną listę kolumn** (`id, name, city,
  avatar_path`), nigdy `*` — prywatne kolumny nie są nawet pobierane.
- Mapuje przez `mapPublicRow` (`PublicProfileRow`), **nie** przez `mapRow` — ten ostatni
  ciągnąłby dane prywatne.
- `getOwnLocation` (`profile.ts:61`) to jedyne wejście do `OwnerLocation` i działa tylko dla
  `profile_id = siebie` (owner-only RLS). Rozdzielenie „mój odczyt" / „obcy odczyt" jest
  typowe (`OwnerLocation` vs `PublicProfile`), nie tylko runtime'owe.

## 4. Szew geo: współrzędne nie przekraczają Data API

Discovery mogłoby skorumpować prywatność, odsyłając GPS do klienta. ACL przesuwa
obliczenie **do bazy**:

- RPC `discoverable_owner_ids()` (SECURITY DEFINER) liczy promień z prywatnych pinów/centrów
  miast i zwraca **tylko ID** właścicieli; współrzędne nigdy nie wychodzą (`profile.ts:185-190`).
- Serwis dostaje listę ID, potem czyta już tylko profile publiczne. Kierunek zależności:
  domena pyta bazę o wynik, nie o dane wrażliwe.

## 5. Szew tożsamości: Supabase auth → Owner domeny

Model użytkownika Supabase (sesja, JWT, cookie) jest tłumaczony na pojęcie **Owner** raz, w
middleware — reszta kodu widzi `locals.user`/`userId`, nie wewnętrzności auth.

- `middleware.ts` rozwiązuje użytkownika i wystawia `locals.user`; `protected-routes.ts`
  bramkuje trasy. Serwisy przyjmują `userId: string`, nie obiekt sesji Supabase.
- Guard własności w `sendInvitation` (`invitation.ts:46-53`) traktuje endpoint jako granicę
  zaufania: FK z bazy dowodzi istnienia psa, ale **własność** weryfikuje domena, nie DB.

## 6. Szew „jeszcze nie w domenie": breeding

`type='breeding'` istnieje w schemacie i w typie (`types.ts:73`), ale **nie ma przepływu**.
To termin z PRD trzymany na granicy — scaffold, nie model. ACL polega tu na świadomym
*nietłumaczeniu*: dopóki nie ma reguł domenowych breeding, nie wpuszczamy ich do rdzenia
([[01-domain-distillation]] → „breeding to backlog").

## Gdzie ACL jest cienki (uczciwie)

- Mapowanie błędów Postgresa na błędy domenowe jest dziś słabe — duplikat-pending wychodzi
  jako surowy 500 zamiast 409 (do naprawy w planie L4, [[02-invariant-aggregate-refactor]]).
- Nie ma repozytoriów/ORM — ACL to konwencja (mappery + szwy), nie wymuszona warstwa. Działa
  dzięki dyscyplinie: `*Row` nieeksportowane, odczyt publiczny osobnym torem. To right-sized,
  ale zależy od przeglądu, nie od typu-bariery.
