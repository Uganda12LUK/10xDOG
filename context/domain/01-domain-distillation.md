# Destylacja domeny PawMeet (Domain Distillation)

> Artefakt DDD M4L5. Cel: oddzielić **rdzeń** (to, co czyni PawMeet PawMeetem i gdzie
> warto inwestować najwięcej projektowania) od tego, co jedynie **wspiera** rdzeń, i od
> tego, co **generyczne** (rozwiązany problem, kupić/przyjąć z półki).
> Dowody: `context/map/repo-map.md` (ranking criticality × buzz), `src/types.ts`,
> `src/lib/services/*`, `supabase/migrations/*`.

## Zdanie-destylat (domain vision)

> PawMeet pozwala właścicielom psów **bezpiecznie i za obopólną zgodą** umawiać
> wspólne spacery i budować trwałe grupy (pack). Wartość rodzi się na styku
> **dopasowania** (znajdź właściwego psa/właściciela w pobliżu) i **zgody**
> (zaproszenie → akceptacja → wspólne spotkanie; pack → odblokowany czat) — przy
> twardej ochronie **prywatności lokalizacji**.

Wszystko inne (tożsamość, mapa, profile, i18n) istnieje po to, by ten jeden przepływ
był możliwy i bezpieczny.

## Klasyfikacja poddomen

| Poddomena | Typ | Dlaczego tu | Gdzie żyje (dowód) |
|---|---|---|---|
| **walk-invitations** (maszyna stanów zaproszeń → spotkanie) | **CORE** | Serce produktu: zgoda materializowana jako spotkanie. Najbogatsza logika + realne ciśnienie poprawek (28% fixów: consent/RLS). | `src/lib/services/invitation.ts`, `api/invitations/*`, migracje `*invitation*`, `harden_consent_rls` |
| **pack-connections** (consent społeczny) | **CORE** | Druga bliźniacza maszyna zgody; odblokowuje relację i czat. Ten sam wzorzec „pending → terminal", inny agregat. | `src/lib/services/pack.ts`, `api/pack`, `create_pack_connections.sql` |
| **discovery-search** (dopasowanie rasa/rozmiar/cechy/wiek/dystans) | **CORE** (differentiator) | „core value" wg mapy repo — bez trafnego dopasowania nie ma po co zapraszać. Reguły dystansu liczone serwerowo. | `src/lib/dogFilter.ts`, `discoverable_owner_ids()` RPC, `src/lib/geo.ts` |
| **map-location + prywatność lokalizacji** | **SUPPORTING** (wrażliwe) | Nie differentiator, ale nośnik invariantu bezpieczeństwa (foreign-read). Najgorętsza strefa ryzyka #1. | `profile_locations` (owner-only RLS), `getOwnLocation`/`getPublicProfile`, migracja `profile_private_location` |
| **dog-profiles** | **SUPPORTING** | Dane rdzeniowe (co dopasowujemy), ale sam CRUD jest specyficzny-nie-wyjątkowy. | `src/lib/services/dog.ts`, `create_dogs.sql`, `dogAttributes/breeds/age.ts` |
| **owner-profile** | **SUPPORTING** | Tożsamość domenowa właściciela (publiczna część); sprzężona z lokalizacją. | `src/lib/services/profile.ts`, `api/profile.ts` |
| **messaging** (czat 1:1) | **GENERIC** (bramkowany rdzeniem) | Czat to problem rozwiązany; o wartości decyduje bramka zgody (`are_in_pack`), nie sam czat. | `src/lib/services/chat.ts`, `create_messages.sql` |
| **auth-access** (tożsamość/sesja/bramka tras) | **GENERIC** | Kupione z półki (Supabase + `@supabase/ssr`). Nośne (hub → 23 pliki), ale nie tu rodzi się wartość. | `src/lib/supabase.ts`, `src/middleware.ts`, `protected-routes.ts` |
| **i18n / shared-foundations / storage avatarów** | **GENERIC** | Infrastruktura: katalogi PL/EN, design system, bucket plików. | `src/lib/i18n`, `src/components/ui`, bucket `avatars` |

## Konsekwencje projektowe (gdzie inwestować)

- **Najwięcej modelowania → CORE.** Maszyny zgody (invitation + pack) zasługują na
  jawny model przejść i wspólny język „consent state machine" — patrz
  [[02-invariant-aggregate-refactor]]. To tam najłatwiej o nielegalne przejście i tam
  jest 24–28% fixów (mapa repo, strefy ryzyka #1–#2).
- **Prywatność lokalizacji to invariant rdzeniowy mimo „supporting".** Choć map-location
  jest wsparciem, przecieka do rdzenia bezpieczeństwa — dlatego ma własny ACL
  (foreign-read seam, RPC liczący dystans serwerowo) → [[03-anti-corruption-layer]].
- **GENERIC trzymać cienko i nie modelować.** auth/i18n/czat przyjmujemy z półki; nie
  budować tu własnej abstrakcji. Czat świadomie pozostaje głupi — mądra jest bramka.
- **breeding to NIE poddomena — to backlog.** `type='breeding'` istnieje w schemacie
  (`src/types.ts:73`), ale bez przepływu; w PRD/issues #6–#9 jako `proposed`. Nie modelować,
  dopóki nie wejdzie realnie (świadomy scaffold, nie dług). Patrz [[glossary]] → „breeding".

## Granice kontekstów (skrót)

Pełny opis per kontekst: [[invitation.md]] (§ Granice kontekstu) i [[README]].
Rdzeniowe: *Spotkania* (Invitation) i *Pack* dzielą **wzorzec** zgody, ale **nie stan** —
osobne agregaty, osobne tabele, bliźniacze triggery. Współdzielić język, nie dane.
