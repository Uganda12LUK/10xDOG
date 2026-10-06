---
project: PawMeet
version: 2
status: draft
created: 2026-09-29
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: "# TODO: qps — see Open Questions"
  data_volume: "# TODO: data_volume — see Open Questions"
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

Nowy właściciel psa/szczeniaka nie wie, z kim go zapoznać w krytycznym oknie socjalizacji (pierwsze tygodnie po adopcji). Istniejące alternatywy — grupy na platformach społecznościowych, fora — są chaotyczne, nie filtrują wg lokalizacji ani charakterystyki psa, i wymagają dużo czasu bez gwarancji wyniku.

Insight: duże platformy są zbyt ogólne, żeby złożyć ten przepływ w całość (profil psa + geolokalizacja + umówienie spotkania). Niszowość rynku to szansa, nie przeszkoda — dedykowana aplikacja może zaoferować kompletny, bezpieczny przepływ socjalizacji: profil właściciela i psa, lokalne odkrywanie, umówienie spotkania — w jednym miejscu.

## User & Persona

Właściciel psa w dużym lub średnim mieście, w pierwszych tygodniach z nowym psem lub szczeniakiem (krytyczne okno socjalizacyjne). Wiek 20–40, aktywny na telefonie, szuka łatwego sposobu na nawiązanie kontaktu z lokalnymi właścicielami psów o podobnym profilu zwierzęcia.

Koszt dziś: grupy i fora — chaotyczne, brak filtrowania wg lokalizacji i cech psa, duże nakłady czasu, brak pewności co do tożsamości drugiej osoby.

## Success Criteria

### Primary
Użytkownik rejestruje się, dodaje profil psa (imię, rasa, wiek, zdjęcie), widzi listę właścicieli psów ze swojej dzielnicy/miasta (manualna lokalizacja), wysyła zaproszenie na spacer do innego właściciela, drugi właściciel potwierdza — oboje widzą umówione spotkanie.

### Secondary
Filtry przy liście właścicieli: rasa psa, wiek psa, odległość (promieniowo od dzielnicy) — umożliwiają lepsze dopasowanie partnerów socjalizacji.

### Guardrails
- Dane kontaktowe i lokalizacja użytkownika są chronione — adres domowy ani precyzyjne współrzędne lokalizacji nie są widoczne publicznie ani dla innych użytkowników.
- Zaproszenie trafia wyłącznie do wybranego użytkownika — integralność przepływu zaproszenie→potwierdzenie jest zachowana.

## User Stories

### US-01: Umówienie spaceru socjalizacyjnego

- **Given** jestem zalogowanym właścicielem psa ze swoim profilem i profilem psa
- **When** przeglądaм listę właścicieli w mojej dzielnicy i wysyłam zaproszenie na spacer do wybranej osoby
- **Then** drugi właściciel może potwierdzić spotkanie i oboje je widzimy w zakładce spotkań

## Functional Requirements

### Profil i onboarding
- FR-001: User can register and log in (email/password or social identity provider login). Priority: must-have
  > Socrates: Brak kontrargumentu — rejestracja jest fundamentem aplikacji społecznościowej. Stoi.
- FR-002: User can create and edit their owner profile (name, photo, district/city). Priority: must-have
  > Socrates: Brak kontrargumentu — zaufanie przed spotkaniem wymaga widoczności właściciela. Stoi.
- FR-003: User can create and edit a dog profile (name, breed, age, photo). Priority: must-have
  > Socrates: Brak kontrargumentu — profil psa jest rdzeniem dopasowania. Stoi.

### Odkrywanie i dopasowanie
- FR-004: User can browse a list of dog owners in their district/city. Priority: must-have
  > Socrates: Counter-argument rozważony: "cold-start — przy małej bazie lista będzie pusta i pierwsi użytkownicy odejdą." Zachowane jako must-have; empty state i seed strategy → Open Questions.
- FR-008: User can filter the owner list by dog breed, dog age, and distance. Priority: nice-to-have
  > Socrates: Brak kontrargumentu — klasyfikacja nice-to-have wystarczająca. Przy małej bazie filtrowanie ma małą wartość; wdrożyć gdy baza urośnie.

### Zaproszenia i spotkania
- FR-005: User can send a walk invitation to another owner. Priority: must-have
  > Socrates: Brak kontrargumentu — bez zaproszenia przepływ nie istnieje. Stoi.
- FR-006: User can confirm or decline an incoming walk invitation. Priority: must-have
  > Socrates: Brak kontrargumentu — potwierdzenie zamyka pętlę spotkania. Stoi.
- FR-007: User can view their scheduled walk meetings. Priority: must-have
  > Socrates: Brak kontrargumentu — użytkownik musi wiedzieć kiedy/gdzie ma spacer. Stoi.

## Non-Functional Requirements

- Prywatność: adres domowy ani precyzyjne współrzędne lokalizacji użytkownika nie są widoczne publicznie ani dla innych użytkowników; jedyna widoczna lokalizacja to dzielnica/miasto podane ręcznie.
- Dostępność: aplikacja działa poprawnie na urządzeniach mobilnych (telefon z przeglądarką mobilną lub PWA) — to primary device użytkownika.
- Responsywność: lista właścicieli w okolicy ładuje się w czasie postrzeganym poniżej 2 sekund od otwarcia ekranu.
- Bezpieczeństwo: profile użytkowników i psów są dostępne wyłącznie po zalogowaniu — anonimowe przeglądanie nie jest możliwe.

## Business Logic

Spotkanie spacerowe nie istnieje dopóki obie strony go nie potwierdzą — produkt zarządza cyklem stanów zaproszenia: wysłane → oczekuje na potwierdzenie → potwierdzone lub odrzucone.

Wejścia (widoczne dla użytkownika): zaproszenie wysłane przez właściciela A do właściciela B; akcja potwierdzenia lub odrzucenia przez właściciela B. Wyjście: status spotkania widoczny dla obu stron; spotkanie pojawia się w zakładce "moje spotkania" wyłącznie po obustronnym potwierdzeniu.

## Access Control

Model uwierzytelnienia: email i hasło lub logowanie przez zewnętrznego dostawcę tożsamości społecznościowej (patrz OQ-004 — konkretni dostawcy do potwierdzenia). Model wieloużytkownikowy — każdy użytkownik ma trwałą tożsamość, co umożliwia kojarzenie właścicieli.

Role: płaski model — wszyscy zalogowani użytkownicy mają te same możliwości (tworzenie profilu własnego i profilu psa, przeglądanie listy właścicieli, inicjowanie i potwierdzanie spotkań). Brak ról admin/moderator w MVP. Dostęp niezalogowany jest wyłączony — wszystkie zasoby wymagają uwierzytelnienia.

## Non-Goals

- Brak modułu weterynarzy i poleceń usług zwierzęcych w MVP — ekosystem (weterynarz, sklepy, grooming) to roadmap post-MVP.
- Brak obsługi innych zwierząt niż psy w MVP — skupienie na psach; rozszerzenie na inne gatunki po weryfikacji hipotezy.

## Open Questions

1. **Cold-start problem (FR-004)** — co pokazać użytkownikowi gdy lista właścicieli jest pusta? Potrzeba: empty state UX, seed data strategy, lub geolocation fallback na szerszy obszar. Owner: user. Block: no (MVP może wystartować z empty state; strategia cold-start wdrożona post-launch).
2. **Chat/wiadomości in-app** — użytkownik nie wykluczył chatu z non-goals. Czy zaproszenie na spacer wystarczy do koordynacji (czas/miejsce), czy potrzebny jest czat in-app? Brak czatu może blokować użytkownika po potwierdzeniu zaproszenia. Owner: user. Block: yes, jeśli koordynacja bez czatu jest niewystarczająca.
3. **Mapa miejsc spacerowymi** — nie wykluczona z MVP. Potwierdzić: czy mapa wchodzi do MVP czy jest roadmap post-MVP? Owner: user. Block: no (brak mapy nie blokuje core flow).
4. **Dostawcy logowania społecznościowego** — w shape-notes wskazano "OAuth (Google/Facebook)" jako opcje logowania społecznościowego. Potwierdzić, którzy konkretni dostawcy wchodzą do MVP jako decyzja produktowa (forward to tech-stack-selector). Owner: user. Block: no (email/password logowanie wystarcza dla MVP; social login jest nice-to-have).
5. **target_scale.qps** — nie określono w shape-notes. Dla small user base prawdopodobnie low; potwierdzić przed tech-stack selection. Owner: user. Block: no.
6. **target_scale.data_volume** — nie określono w shape-notes. Dla small user base prawdopodobnie small; potwierdzić przed tech-stack selection. Owner: user. Block: no.
