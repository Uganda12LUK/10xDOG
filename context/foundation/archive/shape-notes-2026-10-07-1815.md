---
project: PawMeet (working title)
context_type: greenfield
updated: 2026-09-15
checkpoint:
  current_phase: 8
  frs_drafted: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  quality_check_status: accepted
  timeline_budget:
    mvp_weeks: 3
    after_hours_only: true
    hard_deadline: null
  product_type: web-app
  target_scale:
    users: small
---

## Vision & Problem Statement

Nowy właściciel psa/szczeniaka nie wie, z kim go zapoznać w krytycznym oknie socjalizacji (pierwsze tygodnie po adopcji). Istniejące alternatywy — grupy FB, fora — są chaotyczne, nie filtrują wg lokalizacji ani charakterystyki psa, i wymagają dużo czasu bez gwarancji wyniku.

Insight: duże platformy są zbyt ogólne, żeby złożyć ten przepływ w całość (profil psa + geolokalizacja + umówienie spotkania). Niszowość rynku to szansa, nie przeszkoda.

Seed idea (verbatim): Aplikacja społecznościowa (portal) dla właścicieli zwierząt, głównie psów — coś jak Facebook dla zwierząt. Główna funkcja MVP: właściciele mogą dodać swojego psa (podstawowe informacje) i umawiać się z innymi właścicielami na spacery w miejscach publicznych. Core problem: wielu właścicieli psów ma problemy z procesem socjalizacji swojego zwierzęcia. Kolejne etapy: mapa miejsc na spacery, polecani weterynarze, cały ekosystem zwierzęcy.

## User & Persona

Właściciel psa w dużym lub średnim mieście, w pierwszych tygodniach z nowym psem lub szczeniakiem (krytyczne okno socjalizacyjne). Wiek 20–40, aktywny na telefonie, szuka łatwego sposobu na nawiązanie kontaktu z lokalnymi właścicielami psów o podobnym profilu zwierzęcia.

Koszt dziś: grupy FB/fora — chaotyczne, brak filtrowania wg lokalizacji i cech psa, duże nakłady czasu, brak pewności co do tożsamości drugiej osoby.

## Functional Requirements

### Profil i onboarding
- FR-001: User can register and log in (email/password or OAuth). Priority: must-have
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

## Business Logic

Reguła domenowa (jednozdaniowa): Spotkanie spacerowe nie istnieje dopóki obie strony go nie potwierdzą — aplikacja zarządza cyklem stanów: zaproszenie → oczekiwanie na potwierdzenie → potwierdzone / odrzucone.

Wejścia (widoczne dla użytkownika): zaproszenie wysłane przez właściciela A do właściciela B, akcja potwierdzenia lub odrzucenia przez właściciela B.
Wyjście: status spotkania widoczny dla obu stron; spotkanie pojawia się w zakładce "moje spotkania" tylko po obustronnym potwierdzeniu.

## Non-Functional Requirements

- Prywatność: adres domowy ani precyzyjne współrzędne GPS użytkownika nie są widoczne publicznie ani dla innych użytkowników. Jedyna widoczna lokalizacja to dzielnica/miasto podane ręcznie.
- Dostępność: aplikacja działa poprawnie na urządzeniach mobilnych (telefon z przeglądarką mobilną lub PWA) — to primary device użytkownika.
- Responsywność: lista właścicieli w okolicy ładuje się w czasie postrzeganym poniżej 2 sekund od otwarcia ekranu.
- Bezpieczeństwo: profile użytkowników i psów są dostępne wyłącznie po zalogowaniu — anonimowe przeglądanie nie jest możliwe.

## Open Questions

- OQ-001: Cold-start problem (FR-004) — co pokazać użytkownikowi gdy lista właścicieli jest pusta? Potrzeba: empty state UX, seed data strategy, lub geolocation fallback na szerszy obszar.
- OQ-002: Chat/wiadomości — użytkownik nie wykluczył chatu z non-goals. Czy zaproszenie wystarczy do koordynacji (czas/miejsce spaceru), czy potrzebny jest czat in-app? Brak czatu może blokować użytkownika po potwierdzeniu zaproszenia.
- OQ-003: Mapa miejsc spacerowymi — nie wykluczona z MVP. Potwierdzić: czy mapa wchodzi do MVP czy jest roadmap post-MVP?

## User Stories

### US-01: Umówienie spaceru socjalizacyjnego
Given: jestem zalogowanym właścicielem psa ze swoim profilem i profilem psa
When: przeglądaм listę właścicieli w mojej dzielnicy i wysyłam zaproszenie na spacer do wybranej osoby
Then: drugi właściciel może potwierdzić spotkanie i oboje je widzimy w zakładce spotkań

## Success Criteria

### Primary
Użytkownik rejestruje się, dodaje profil psa (imię, rasa, wiek, zdjęcie), widzi listę właścicieli psów ze swojej dzielnicy/miasta (manualna lokalizacja), wysyła zaproszenie na spacer do innego właściciela, drugi właściciel potwierdza — oboje widzą umówione spotkanie.

### Secondary
Filtry przy liście właścicieli: rasa psa, wiek psa, odległość (promieniowo od dzielnicy) — umożliwiają lepsze dopasowanie partnerów socjalizacji.

### Guardrails
- Dane kontaktowe i lokalizacja użytkownika są chronione — adres domowy ani precyzyjne GPS nie są widoczne publicznie.
- Zaproszenie trafia wyłącznie do wybranego użytkownika — integralność przepływu zaproszenie→potwierdzenie.

## Non-Goals

- Brak modułu weterynarzy i poleceń usług zwierzęcych w MVP — ekosystem (weterynarz, sklepy, grooming) to roadmap post-MVP.
- Brak obsługi innych zwierząt niż psy w MVP — skupienie na psach; rozszerzenie na inne gatunki po weryfikacji hipotezy.

## Access Control

Model: login email + hasło lub OAuth (Google/Facebook). Multi-user — każdy użytkownik ma trwałą tożsamość, co umożliwia kojarzenie właścicieli.

Role: płaski model — wszyscy użytkownicy mają te same możliwości. Każdy może mieć profil własny, profil psa i inicjować spotkania. Brak ról admin/moderator w MVP.
