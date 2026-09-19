---
project: PawMeet (working title)
version: 1
status: draft
created: 2026-09-15
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

Nowy właściciel psa lub szczeniaka nie wie, z kim go zapoznać w krytycznym oknie socjalizacji — pierwszych tygodniach po adopcji, gdy każde wprowadzenie nowych bodźców i kontaktów z innymi psami ma trwały wpływ na zachowanie zwierzęcia. Istniejące alternatywy — grupy na Facebooku, fora tematyczne — są chaotyczne, nie pozwalają filtrować po lokalizacji ani charakterystyce psa i wymagają nakładów czasu bez gwarancji rezultatu.

Duże platformy są zbyt ogólne, żeby złożyć ten przepływ w całość: profil psa, lokalizacja, umówienie spotkania w jednym miejscu. Niszowość rynku jest szansą — brak dedykowanego narzędzia do socjalizacji psów to luka, którą można zamknąć. Ta sama aplikacja obsługuje drugi cel: właściciele psów szukający partnera hodowlanego tej samej rasy korzystają dziś z rozproszonych ogłoszeń bez możliwości łatwej weryfikacji i kontaktu w jednym miejscu.

## User & Persona

**Primary persona:** Właściciel psa w dużym lub średnim mieście, w pierwszych tygodniach z nowym psem lub szczeniakiem (krytyczne okno socjalizacyjne). Wiek 20–40 lat, aktywny na telefonie, szuka łatwego sposobu na nawiązanie kontaktu z lokalnymi właścicielami psów o podobnym profilu zwierzęcia.

Dzisiaj sięga po grupy na portalach społecznościowych lub fora tematyczne: chaotyczne, bez filtrowania wg lokalizacji i cech psa, duże nakłady czasu, brak pewności co do tożsamości drugiej osoby.

## Success Criteria

### Primary
Użytkownik rejestruje się, tworzy profil własny i profil psa, widzi listę właścicieli psów ze swojej dzielnicy lub miasta (manualna lokalizacja), wysyła zaproszenie na spacer do innego właściciela — drugi właściciel potwierdza spotkanie i oboje je widzą w swoich zakładkach spotkań.

### Secondary
Filtry przy liście właścicieli: rasa psa, wiek psa, odległość od dzielnicy — umożliwiają lepsze dopasowanie partnerów socjalizacji.

### Guardrails
- Dane kontaktowe i lokalizacja użytkownika są chronione — adres domowy ani precyzyjne współrzędne nie są widoczne publicznie ani innym użytkownikom.
- Zaproszenie trafia wyłącznie do wybranego użytkownika — integralność przepływu zaproszenie → potwierdzenie jest zachowana.

## User Stories

### US-01: Umówienie spaceru socjalizacyjnego

- **Given** zalogowany właściciel psa ma skonfigurowany profil własny i profil psa
- **When** przegląda listę właścicieli w swojej dzielnicy i wysyła zaproszenie na spacer do wybranej osoby
- **Then** drugi właściciel może potwierdzić spotkanie, a oboje widzą je w zakładce spotkań

#### Acceptance Criteria
- Spotkanie pojawia się w zakładce spotkań wyłącznie po potwierdzeniu przez obie strony.
- Zaproszenie, które nie zostało potwierdzone ani odrzucone, nie tworzy aktywnego spotkania.

### US-02: Znalezienie partnera hodowlanego

- **Given** zalogowany właściciel psa oznaczył swojego psa jako dostępnego do hodowli (z podaną rasą)
- **When** przegląda listę psów tej samej rasy dostępnych do hodowli i wysyła zapytanie hodowlane do wybranego właściciela
- **Then** drugi właściciel może potwierdzić lub odrzucić zapytanie, a oboje widzą status w zakładce spotkań

#### Acceptance Criteria
- Lista w widoku hodowlanym pokazuje wyłącznie psy oznaczone jako dostępne do hodowli i tej samej rasy co pies wysyłającego.
- Zapytanie hodowlane i zaproszenie na spacer są wyraźnie od siebie odróżnione w widoku spotkań.

## Functional Requirements

### Profil i onboarding
- FR-001: User can register and log in with email and password, or via an external account provider. Priority: must-have
  > Socrates: Brak kontrargumentu — rejestracja jest fundamentem aplikacji społecznościowej. Stoi.
- FR-002: User can create and edit their owner profile (name, photo, district/city). Priority: must-have
  > Socrates: Brak kontrargumentu — zaufanie przed spotkaniem wymaga widoczności właściciela. Stoi.
- FR-003: User can create and edit a dog profile (name, breed, age, photo). Priority: must-have
  > Socrates: Brak kontrargumentu — profil psa jest rdzeniem dopasowania. Stoi.

### Odkrywanie i dopasowanie
- FR-009: User can mark their dog's profile as available for breeding (togglable flag, visible on the dog's profile card). Priority: must-have
- FR-010: User can browse a list of dogs of the same breed marked as available for breeding. Priority: must-have
- FR-004: User can browse a list of dog owners in their district/city. Priority: must-have
  > Socrates: Counter-argument rozważony: "cold-start — przy małej bazie lista będzie pusta i pierwsi użytkownicy odejdą." Zachowane jako must-have; empty state i seed strategy → Open Questions.
- FR-008: User can filter the owner list by dog breed, dog age, and distance. Priority: nice-to-have
  > Socrates: Brak kontrargumentu — klasyfikacja nice-to-have wystarczająca. Przy małej bazie filtrowanie ma małą wartość; wdrożyć gdy baza urośnie.

### Zaproszenia i spotkania
- FR-011: User can send a breeding inquiry to the owner of a dog marked as available for breeding. Priority: must-have
- FR-005: User can send a walk invitation to another owner. Priority: must-have
  > Socrates: Brak kontrargumentu — bez zaproszenia przepływ nie istnieje. Stoi.
- FR-006: User can confirm or decline an incoming walk invitation. Priority: must-have
  > Socrates: Brak kontrargumentu — potwierdzenie zamyka pętlę spotkania. Stoi.
- FR-007: User can view their scheduled walk meetings. Priority: must-have
  > Socrates: Brak kontrargumentu — użytkownik musi wiedzieć kiedy/gdzie ma spacer. Stoi.

## Non-Functional Requirements

- Prywatność: adres domowy ani precyzyjne współrzędne geograficzne użytkownika nie są widoczne publicznie ani dla innych użytkowników — jedyna widoczna lokalizacja to dzielnica lub miasto podane ręcznie przez użytkownika.
- Dostępność mobilna: aplikacja jest w pełni użyteczna na telefonie z przeglądarką mobilną — to primary device użytkownika.
- Responsywność: lista właścicieli w okolicy ładuje się w czasie postrzeganym poniżej 2 sekund od momentu otwarcia ekranu.
- Bezpieczeństwo dostępu: profile użytkowników i psów są dostępne wyłącznie po zalogowaniu — anonimowe przeglądanie jest niemożliwe.

## Business Logic

Aplikacja obsługuje dwa typy kontaktu między właścicielami — zaproszenie na spacer socjalizacyjny i zapytanie hodowlane — oba podlegają temu samemu cyklowi stanów: zaproszenie / zapytanie → oczekiwanie na potwierdzenie → potwierdzone / odrzucone. Spotkanie żadnego typu nie istnieje dopóki obie strony go nie potwierdzą.

Wejścia: akcja wysłania zaproszenia lub zapytania przez właściciela A; akcja potwierdzenia lub odrzucenia przez właściciela B. Wyjście: status widoczny dla obu stron w zakładce spotkań — typ spotkania (spacer / hodowlane) jest rozróżniony w widoku. Lista psów dostępnych do hodowli (FR-010) zwraca wyłącznie psy oznaczone flagą hodowlaną i tej samej rasy co pies wysyłającego.

## Access Control

Multi-user. Każdy użytkownik tworzy konto przez rejestrację z adresem e-mail i hasłem, lub poprzez logowanie z użyciem zewnętrznego dostawcy konta (zob. OQ-005 — wybór dostawców do potwierdzenia). Konto nadaje trwałą tożsamość niezbędną do kojarzenia właścicieli.

Role: płaski model — wszyscy zalogowani użytkownicy mają identyczne uprawnienia. Każdy użytkownik może zarządzać własnym profilem i profilem swojego psa, przeglądać listę właścicieli oraz inicjować zaproszenia do spotkań. Brak ról administratora lub moderatora w MVP.

Dostęp niezalogowany: nieuwierzytelniony użytkownik jest przekierowywany do widoku logowania — przeglądanie profili bez logowania jest niemożliwe.

## Non-Goals

- Brak weryfikacji dokumentów hodowlanych (rodowód, wyniki badań genetycznych, certyfikaty FCI) — aplikacja nie potwierdza ani nie przechowuje papierów hodowlanych; odpowiedzialność za weryfikację leży po stronie właścicieli.
- Brak modułu weterynarzy i poleceń usług zwierzęcych w MVP — ekosystem (weterynarz, sklepy, grooming) jest zaplanowany jako roadmap post-MVP.
- Brak obsługi zwierząt innych niż psy w MVP — skupienie na psach; rozszerzenie na inne gatunki nastąpi po weryfikacji hipotezy produktowej.

## Open Questions

1. **Cold-start (FR-004): co pokazać gdy lista właścicieli jest pusta?** Potrzeba: empty state UX, seed data strategy lub fallback na szerszy obszar geograficzny przy małej lokalnej bazie. Właściciel: user. Block: nie (przepływ działa, lecz UX jest słaby przy pustej liście).
2. **Chat / wiadomości po potwierdzeniu zaproszenia.** Czy przepływ zaproszenia (FR-005, FR-006) wystarcza do koordynacji szczegółów spotkania (czas, konkretne miejsce), czy potrzebny jest czat in-app? Brak możliwości doprecyzowania szczegółów po potwierdzeniu może blokować użytkownika. Właściciel: user. Block: możliwy (jeśli koordynacja poza aplikacją jest niewystarczająca, FR musi zostać rozszerzony).
3. **Mapa miejsc spacerowymi — MVP czy post-MVP?** Mapa nie została wykluczona z non-goals. Potwierdzić zakres: czy funkcja mapy wchodzi do MVP, czy jest roadmap. Właściciel: user. Block: tak, jeśli w MVP — wymaga dodatkowych FR przed startem implementacji.
4. **target_scale.qps i target_scale.data_volume.** Nie zostały sprecyzowane podczas kształtowania. Przyjęte przybliżenie: qps: low, data_volume: small (zgodnie z users: small). Potwierdzić lub skorygować przed wyborem stosu. Właściciel: user. Block: nie.
5. **Zewnętrzny dostawca konta (FR-001).** Który dostawca logowania zewnętrznego jest priorytetem (np. Google, Apple, inne)? Wybór jest decyzją product-level — konkretna integracja zależy od stosu. Właściciel: user. Block: nie w MVP (email + hasło wystarcza do uruchomienia).
