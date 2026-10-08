---
project: PawMeet — "Moje stado" (pack + bone-throw + chat)
context_type: brownfield
updated: 2026-10-07
checkpoint:
  current_phase: 8
  frs_drafted: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  quality_check_status: warned
  timeline_budget:
    delivery_weeks: 1
    after_hours_only: true
    hard_deadline: null
  product_type: web-app
  target_scale:
    users: small
---

## Current System

PawMeet — istniejąca SSR web app (Astro + React islands, Supabase auth + DB, Cloudflare Workers). Użytkownicy: właściciele psów, płaski model ról, login email/OAuth.

Co istnieje dziś:
- Profil właściciela (imię, dzielnica/miasto, zdjęcie, pin lokalizacji) i profil psa (imię, rasa, wiek, cechy, zdjęcie).
- Mapa właścicieli w okolicy (Leaflet, pinezki) + lista odkrywania.
- Zaproszenia typu `walk`/`breeding` → spotkanie istnieje dopiero po obustronnym potwierdzeniu (tabela `invitations`, stany pending/accepted/declined).

Czego NIE ma: trwałej relacji „znajomości" między właścicielami oraz czatu (potwierdzone: zero użycia Supabase Realtime w kodzie).

Must preserve:
- Pętla zaproszenie→potwierdzenie spaceru działa bez zmian.
- Guardrail prywatności: adres domowy ani precyzyjne GPS nie są widoczne publicznie; dostęp tylko po zalogowaniu.

## Vision & Problem Statement

Po potwierdzeniu spaceru właściciele nie mają w aplikacji żadnego sposobu, by utrzymać kontakt ani uzgodnić szczegóły — muszą wychodzić na zewnątrz (FB, telefon). Brakuje też trwałej relacji: każde spotkanie jest jednorazowe, znajomość nie „zostaje". To domyka otwarte pytanie OQ-002 z oryginalnego shapingu produktu.

Delta tej zmiany: wprowadzić trwałą relację społeczną **„moje stado"** (znajomości między właścicielami/psami), zawieraną przez gest **„rzutu kością"** (klik w znaczek psiej kości → animacja → zaproszenie), i odblokować **czat 1:1** między członkami stada. Członek stada ma wyróżniającą oprawkę wśród innych psów w okolicy.

Insight: zaproszenie na spacer to za mało, by zbudować społeczność — potrzebna jest lekka, zabawowa mechanika nawiązywania trwałych znajomości, osadzona w metaforze psiej (kość = zaproszenie, stado = krąg znajomych).

Seed idea (verbatim): użytkownik czyli „pies" zaprasza psa; jak nawiążą już kontakt to mogą pisać. Zaproszenie przez „rzucenie kości" — na danym psie klik w znaczek psiej kości, animacja że kość rzucona, co generuje zaproszenie do znajomych psów. To się nazywa „moje stado". Pies dodany do stada powinien mieć jakąś oprawkę, żeby się wyróżnić wśród innych w okolicy.

## User & Persona

Ta sama persona co produkt: właściciel psa w średnim/dużym mieście, aktywny na telefonie, szukający trwałego kontaktu z lokalnymi właścicielami o podobnym profilu psa. Nowy nacisk: chce nie tylko umówić jednorazowy spacer, ale utrzymać relację i móc napisać wiadomość.

## Success Criteria

### Primary
User A rzuca kość do User B (z profilu) → B łapie (akceptuje) → oboje widzą się w „moje stado" → A pisze wiadomość, B ją czyta i odpowiada → marker B u A ma wyróżniającą oprawkę.

### Secondary
Rzut kością dostępny także z pinezki na mapie i z listy właścicieli w okolicy.

### Guardrails
- Nie można rzucić kości do samego siebie; brak duplikatu oczekującego zaproszenia.
- Rozmowę czytają/piszą wyłącznie dwaj właściciele w jednym (zaakceptowanym) stadzie.
- Istniejąca pętla zaproszenie→potwierdzenie spaceru oraz guardrail lokalizacji pozostają nietknięte.

## Functional Requirements

### Stado (relacja znajomości)
- FR-001: User can throw a bone (send a pack request) to another owner from their profile, a map pin, or the owner list. Priority: must-have. Change: new
- FR-002: User can accept ("catch the bone") or decline an incoming pack request. Priority: must-have. Change: new
- FR-003: User can view "moje stado" — the list of owners with a mutually accepted connection. Priority: must-have. Change: new
- FR-006: User cannot throw a bone to themselves, and a duplicate pending request is blocked. Priority: must-have. Change: new (guardrail)

### Czat
- FR-004: User can send and read 1:1 text messages with any owner in their pack. Priority: must-have. Change: new

### Wyróżnienie w okolicy
- FR-005: An owner in the viewer's pack is visually distinguished (badge / "oprawka") on the map and in the area list. Priority: must-have. Change: new

### Zachowane (defensywne)
- FR-007: Existing walk/breeding invitation→confirmation loop continues to work unchanged. Priority: must-have. Change: preserved
- FR-008: Privacy guardrail (no public GPS/address; login-only access) holds for pack and chat. Priority: must-have. Change: preserved

## User Stories

### US-01: Rzuć kość i zacznij pisać
Given: jestem zalogowanym właścicielem i oglądam profil innego właściciela
When: klikam znaczek psiej kości (rzut), a drugi właściciel łapie kość (akceptuje)
Then: oboje jesteśmy w swoich stadach, mogę otworzyć z nim czat i wymienić wiadomości, a jego marker w okolicy ma wyróżniającą oprawkę

## Business Logic

Reguła domenowa (jednozdaniowa): Relacja stada — i czat, który odblokowuje — nie istnieje dopóki obie strony się nie zgodzą: jedna rzuca kość, druga ją łapie; dopiero zaakceptowane połączenie daje członkostwo w stadzie i możliwość pisania.

Wejścia (widoczne dla użytkownika): rzut kością od A do B; akcja złapania (akceptacji) lub odrzucenia przez B.
Wyjście: para właścicieli w stadach obu stron; odblokowany kanał czatu 1:1; oprawka na markerze/profilu członka stada. Mechanika jest świadomie równoległa do istniejącej reguły spotkań (nic nie istnieje bez obustronnej zgody).

## Non-Functional Requirements

- Prywatność: treść rozmowy czytają i piszą wyłącznie dwaj właściciele w zaakceptowanym stadzie — nie-członek nie odczyta ani nie wyśle wiadomości w cudzej rozmowie (egzekwowane na poziomie dostępu do danych, nie tylko UI).
- Integralność zaproszenia: kość trafia wyłącznie do wskazanego właściciela; brak rzutu do siebie; brak duplikatu oczekującego.
- Dostępność: działa poprawnie na urządzeniu mobilnym (primary device).
- Brak regresji: istniejąca pętla spotkań i guardrail lokalizacji działają jak dotąd.

## Constraints & Preserved Behavior

- Migracje stosowane przez zdalny Supabase SQL Editor / session pooler (brak lokalnego Dockera na tej maszynie).
- RLS obowiązkowe na nowych tabelach (`pack_connections`, `messages`), granularnie per-operacja/per-rola — zgodnie z konwencją projektu i guardrailem PRD (dane tylko dla zalogowanych/uprawnionych).
- Reuse istniejących wzorców: `invitations` (tabela/stany), `src/lib/services/*`, API w `src/pages/api/`, komponenty `src/components/ui/`.
- Tokeny designu jako jedyne źródło koloru (znaczek kości, oprawka) — bez literałów hex/rgb/palety Tailwind, także w HTML divIcon Leaflet.

## Non-Goals

- Brak czatu na żywo (Supabase Realtime) w v1 — dostarczanie przez wyślij+odśwież; live to v2.
- Brak czatu grupowego — tylko 1:1 między członkami stada.
- Brak zdjęć/media w czacie — tylko tekst.
- Brak powiadomień push/email o nowej kości lub wiadomości.
- Brak powiązania stada z przepływem hodowlanym (breeding).
- Brak zaawansowanej animacji/fizyki rzutu — maksymalnie prosty efekt CSS.

## Forward: technical-roadmap

- v2: czat na żywo przez Supabase Realtime (`postgres_changes` na `messages`), wskaźnik „pisze…", liczniki nieprzeczytanych.
- v2: powiadomienia (push/email) o nowej kości i wiadomości.
- Rozważyć efekt animacji rzutu kością jako osobny, izolowany komponent prezentacyjny z bramką wizualną (kitchen-sink), zgodnie z konwencją UI.

## Quality cross-check

Shaping skrócony świadomie na życzenie użytkownika (dostawa „dziś", cięty slice). Pełny łańcuch /10x-prd pominięty — ta zmiana idzie prosto do planu + implementacji. Gap zapisany jako `warned`.
