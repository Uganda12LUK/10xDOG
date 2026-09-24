---
project: PawMeet
version: 1
status: draft
created: 2026-09-22
updated: 2026-09-24
prd_version: 1
main_goal: market-feedback
top_blocker: decisions
milestone_id: mvp-core-loops
milestone_seq: 1
milestone_status: open
---

# Roadmap: PawMeet

> Derived from context/foundation/prd.md (v1) + tech-stack.md + infrastructure.md + deploy-plan.md + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: Rdzeniowe pętle MVP (spacer + hodowla)** — Status: open

- **Intent:** Dostarczyć obie pętle kontaktu między właścicielami end-to-end — od rejestracji i profili, przez odkrywanie, po zaproszenie → potwierdzenie → wspólne spotkanie — tak, by można było zweryfikować hipotezę produktową na żywych użytkownikach.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** każdy F-NN i S-NN poniżej jest `done`.
- **Scope anchors:** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-009, FR-010, FR-011; US-01, US-02. (FR-008 nice-to-have — zaparkowany.)

## Vision recap

Nowy właściciel psa w krytycznym oknie socjalizacji nie ma dedykowanego narzędzia, by znaleźć lokalnych właścicieli o podobnym profilu zwierzęcia i umówić spacer — dzisiejsze alternatywy (grupy FB, fora) są chaotyczne i bez filtrowania. PawMeet składa profil psa, lokalizację (dzielnica/miasto, ręcznie) i umawianie spotkania w jednym miejscu. Ta sama aplikacja obsługuje drugą hipotezę: kojarzenie partnerów hodowlanych tej samej rasy.

## North star

**S-04: użytkownik wysyła zaproszenie na spacer, a drugi właściciel je potwierdza (i oboje widzą spotkanie).** — To moment, w którym zachodzi dwustronne skojarzenie — najbardziej ryzykowne założenie całego produktu; wszystko inne ma znaczenie tylko jeśli ta pętla działa.

> Gwiazda przewodnia (north star) = najmniejszy, kompletny od początku do końca przepływ, którego udane dostarczenie udowadnia rdzeniową hipotezę produktu — umieszczony tak wcześnie, jak pozwalają zależności. Pętla zamyka się wizualnie na S-05 (widok spotkań), ale to potwierdzenie zaproszenia w S-04 jest właściwym dowodem.

## At a glance

| ID   | Change ID                 | Outcome (użytkownik może …)                                   | Prerequisites | PRD refs              | Status   |
| ---- | ------------------------- | ------------------------------------------------------------- | ------------- | --------------------- | -------- |
| F-01 | data-privacy-baseline     | (foundation) migracje + wzorzec RLS + gating tras za loginem  | —             | FR-001, NFR-prywatność, Access Control | ready    |
| S-01 | owner-profile             | tworzy i edytuje profil właściciela (imię, foto, dzielnica)   | F-01          | FR-002, US-01         | done |
| S-02 | dog-profile               | tworzy i edytuje profil psa (imię, rasa, wiek, foto)          | F-01          | FR-003, US-01         | proposed |
| S-03 | owner-discovery-list      | przegląda listę właścicieli w swojej dzielnicy/mieście        | S-01, S-02    | FR-004, US-01         | proposed |
| S-04 | walk-invitation-loop      | wysyła zaproszenie na spacer; odbiorca potwierdza/odrzuca      | S-03          | FR-005, FR-006, US-01 | proposed |
| S-05 | scheduled-meetings-view   | widzi swoje potwierdzone spotkania w zakładce spotkań         | S-04          | FR-007, US-01         | proposed |
| S-06 | breeding-availability-flag| oznacza psa jako dostępnego do hodowli (przełącznik)          | S-02          | FR-009, US-02         | proposed |
| S-07 | breeding-discovery-list   | przegląda psy tej samej rasy oznaczone do hodowli             | S-06          | FR-010, US-02         | proposed |
| S-08 | breeding-inquiry-loop     | wysyła zapytanie hodowlane; właściciel potwierdza/odrzuca      | S-07, S-04    | FR-011, US-02         | proposed |

## Streams

Navigation aid — grupuje elementy dzielące łańcuch zależności. Kanoniczna kolejność żyje w grafie zależności poniżej; ta tabela to proponowana kolejność czytania równoległych torów.

| Stream | Theme                     | Chain                                | Note                                                                 |
| ------ | ------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| A      | Onboarding profili        | `F-01` → `S-01` → `S-02`             | Fundament danych/prywatności; S-01 i S-02 równoległe po F-01.        |
| B      | Pętla spaceru (gwiazda)   | `S-03` → `S-04` → `S-05`             | Dołącza do A po S-01/S-02; zawiera north star (S-04) — priorytet.    |
| C      | Pętla hodowlana           | `S-06` → `S-07` → `S-08`             | Dołącza do A po S-02; S-08 dołącza do B przy S-04 (reużywa cykl zaproszeń). |

## Baseline

Co jest już w kodzie na dzień `2026-09-22` (auto-researched + potwierdzone przez użytkownika). Foundations poniżej zakładają, że to istnieje, i NIE budują tego ponownie.

- **Frontend:** present — Astro 7 + React 19 + Tailwind 4 + shadcn/ui (`src/components/ui`, `Topbar.astro`, `Welcome.astro`).
- **Backend / API:** present — Astro SSR, wzorzec endpointów w `src/pages/api/auth/*` (uppercase GET/POST, walidacja zod per konwencja).
- **Data:** absent — Supabase podłączony (żywy projekt), ale brak migracji/tabel domenowych (`supabase/migrations` nie istnieje; tylko wbudowany schemat `auth`).
- **Auth:** present — Supabase SSR cookie sessions (`src/lib/supabase.ts`), middleware z `PROTECTED_ROUTES` (`src/middleware.ts`), signin/signup/signout, `/dashboard` chroniony — zweryfikowane na żywo.
- **Deploy / infra:** present — Cloudflare Workers, wdrożone (`pawmeet.majerskiluk.workers.dev`), `wrangler`, CI na `main`, sekrety ustawione (patrz `context/deployment/deploy-plan.md`).
- **Observability:** partial — CF observability włączone w `wrangler.jsonc` + MCP `cloudflare-observability` dodany; brak app-level structured logging / error trackingu.

## Foundations

### F-01: Fundament danych i prywatności

- **Outcome:** (foundation) uruchomiony workflow migracji Supabase, ustalony wzorzec RLS (granularne polityki per-operacja/per-rola), a wszystkie widoki profili i list wymagają zalogowania — anonimowe przeglądanie niemożliwe.
- **Change ID:** data-privacy-baseline
- **PRD refs:** FR-001 (login jako brama), NFR: prywatność (adres/współrzędne niewidoczne), NFR: dostęp za loginem, Access Control
- **Unlocks:** S-01, S-02 (i pośrednio wszystkie kolejne slice'y danych); redukuje ryzyko NFR-prywatności; tworzy ścieżkę weryfikacji „RLS blokuje dostęp niezalogowanego/cudzych danych".
- **Prerequisites:** — (auth obecny w baseline)
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sekwencjonowany pierwszy, bo bez wzorca RLS każdy kolejny slice ryzykuje wyciek danych (guardrail PRD). Trzymać go minimalnym — sam wzorzec + gating tras; konkretne tabele powstają w slice'ach, które ich używają (progresywne odsłanianie). Ryzyko: przeciążenie foundationu w „całą warstwę danych" — świadomie unikane.
- **Status:** ready

## Slices

### S-01: Profil właściciela

- **Outcome:** użytkownik może utworzyć i edytować swój profil właściciela (imię, zdjęcie, dzielnica/miasto).
- **Change ID:** owner-profile
- **PRD refs:** FR-002, US-01
- **Prerequisites:** F-01
- **Parallel with:** S-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Fundament zaufania przed spotkaniem; prosty CRUD na tabeli `profiles` z RLS wg wzorca F-01. Mała powierzchnia ryzyka.
- **Status:** done

### S-02: Profil psa

- **Outcome:** użytkownik może utworzyć i edytować profil psa (imię, rasa, wiek, zdjęcie).
- **Change ID:** dog-profile
- **PRD refs:** FR-003, US-01
- **Prerequisites:** F-01
- **Parallel with:** S-01
- **Blockers:** —
- **Unknowns:**
  - Czy pies należy do użytkownika (auth id) czy do rekordu profilu właściciela? — Owner: TBD. Block: no (nie blokuje planowania; do rozstrzygnięcia w /10x-plan).
- **Risk:** Rdzeń dopasowania (rasa/wiek zasilają listy i filtry). Niezależny od S-01 na poziomie danych → równoległy.
- **Status:** proposed

### S-03: Lista właścicieli w okolicy

- **Outcome:** użytkownik może przeglądać listę właścicieli psów w swojej dzielnicy/mieście (tylko po zalogowaniu).
- **Change ID:** owner-discovery-list
- **PRD refs:** FR-004, US-01
- **Prerequisites:** S-01, S-02
- **Parallel with:** S-06
- **Blockers:** —
- **Unknowns:**
  - Cold-start: co pokazać, gdy lista jest pusta (empty state / seed / szerszy obszar)? — Owner: user. Block: no (przepływ działa, UX słaby przy pustej liście — OQ-001).
- **Risk:** Wymaga istniejących profili właściciela i psa, stąd po S-01/S-02. NFR responsywności (<2s) do pilnowania w /10x-plan. Równoległy z torem hodowlanym.
- **Status:** proposed

### S-04: Pętla zaproszenia na spacer

- **Outcome:** użytkownik może wysłać zaproszenie na spacer do wybranego właściciela, a odbiorca może je potwierdzić lub odrzucić.
- **Change ID:** walk-invitation-loop
- **PRD refs:** FR-005, FR-006, US-01
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Czy sama para zaproszenie/potwierdzenie wystarcza do koordynacji szczegółów (czas, miejsce), czy potrzebny czat in-app? — Owner: user. Block: no (pętla jest w pełni wyspecyfikowana i działa bez czatu; czat to potencjalne rozszerzenie — OQ-002).
- **Risk:** GWIAZDA PRZEWODNIA — najbardziej ryzykowne założenie (dwustronne skojarzenie). Integralność przepływu zaproszenie→potwierdzenie to guardrail PRD (zaproszenie trafia wyłącznie do wybranego użytkownika). Cykl stanów tu zbudowany jest reużywany przez S-08.
- **Status:** proposed

### S-05: Widok zaplanowanych spotkań

- **Outcome:** użytkownik widzi swoje potwierdzone spotkania w zakładce spotkań (typ: spacer).
- **Change ID:** scheduled-meetings-view
- **PRD refs:** FR-007, US-01
- **Prerequisites:** S-04
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Cienkie domknięcie pętli — spotkanie pojawia się wyłącznie po obustronnym potwierdzeniu (Business Logic). Zależny od cyklu stanów z S-04.
- **Status:** proposed

### S-06: Flaga dostępności hodowlanej

- **Outcome:** użytkownik może oznaczyć profil psa jako dostępny do hodowli (przełącznik widoczny na karcie psa).
- **Change ID:** breeding-availability-flag
- **PRD refs:** FR-009, US-02
- **Prerequisites:** S-02
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Mały dodatek do profilu psa; otwiera tor hodowlany równolegle do toru spaceru. Bez niego S-07 nie ma czego listować.
- **Status:** proposed

### S-07: Lista psów do hodowli

- **Outcome:** użytkownik może przeglądać listę psów tej samej rasy co jego pies, oznaczonych jako dostępne do hodowli.
- **Change ID:** breeding-discovery-list
- **PRD refs:** FR-010, US-02
- **Prerequisites:** S-06
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Filtrowanie po fladze hodowlanej + tej samej rasie co pies wysyłającego (Business Logic). Zależny od istnienia flagi (S-06).
- **Status:** proposed

### S-08: Pętla zapytania hodowlanego

- **Outcome:** użytkownik może wysłać zapytanie hodowlane do właściciela wybranego psa, a ten może je potwierdzić lub odrzucić (status widoczny dla obu w zakładce spotkań, odróżniony od spaceru).
- **Change ID:** breeding-inquiry-loop
- **PRD refs:** FR-011, US-02
- **Prerequisites:** S-07, S-04
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Reużywa cykl stanów zaproszeń z S-04 (stąd podwójna zależność) — typ „hodowlane" musi być wyraźnie odróżniony od „spacer" w widoku spotkań. Ryzyko: rozjazd dwóch cykli, jeśli S-04 nie wyodrębni wspólnej maszyny stanów.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                  | Suggested issue title                                   | Ready for `/10x-plan` | Notes |
| ---------- | -------------------------- | ------------------------------------------------------- | --------------------- | ----- |
| F-01       | data-privacy-baseline      | Fundament danych: migracje + wzorzec RLS + gating tras  | yes                   | Zacznij tutaj — odblokowuje wszystko. |
| S-01       | owner-profile              | Profil właściciela (CRUD + RLS)                         | no                    | Po F-01. Równoległy z S-02. |
| S-02       | dog-profile                | Profil psa (CRUD + RLS)                                 | no                    | Po F-01. Równoległy z S-01. |
| S-03       | owner-discovery-list       | Lista właścicieli w okolicy                             | no                    | Po S-01, S-02. Cold-start = OQ-001. |
| S-04       | walk-invitation-loop       | Pętla zaproszenia na spacer (send + confirm/decline)    | no                    | North star. Po S-03. |
| S-05       | scheduled-meetings-view    | Zakładka spotkań (widok potwierdzonych)                 | no                    | Po S-04. |
| S-06       | breeding-availability-flag | Flaga „dostępny do hodowli" na profilu psa              | no                    | Po S-02. Równoległy z torem spaceru. |
| S-07       | breeding-discovery-list    | Lista psów do hodowli (ta sama rasa)                    | no                    | Po S-06. |
| S-08       | breeding-inquiry-loop      | Pętla zapytania hodowlanego                             | no                    | Po S-07, S-04. |

## Open Roadmap Questions

1. **Mapa miejsc spacerowych — MVP czy post-MVP?** — Owner: user. Block: `roadmap-wide` (jeśli w MVP → wymaga nowych FR i slice'ów przed startem; obecnie żaden slice nie zależy od mapy). To główny bloker zakresowy (OQ-003).
2. **Czat / wiadomości po potwierdzeniu zaproszenia.** — Owner: user. Block: gates `S-04`, `S-05` warunkowo (jeśli koordynacja poza aplikacją jest niewystarczająca, FR-005/006 trzeba rozszerzyć). Obecnie nie blokuje (OQ-002).
3. **Cold-start (FR-004): co pokazać, gdy lista właścicieli jest pusta?** — Owner: user. Block: gates `S-03` UX-owo, nie funkcjonalnie (OQ-001).
4. **Zewnętrzny dostawca konta (FR-001): który priorytetem (Google/Apple/inne)?** — Owner: user. Block: nie w MVP (email+hasło wystarcza, już działa) (OQ-005).
5. **target_scale.qps i data_volume — potwierdzić przybliżenie (low/small).** — Owner: user. Block: nie (OQ-004).

## Parked

- **FR-008: filtry listy właścicieli (rasa, wiek, odległość).** — Why parked: nice-to-have; PRD wprost: przy małej bazie filtrowanie ma małą wartość — wdrożyć, gdy baza urośnie.
- **Weryfikacja dokumentów hodowlanych (rodowód, badania, FCI).** — Why parked: PRD §Non-Goals — odpowiedzialność po stronie właścicieli.
- **Moduł weterynarzy i poleceń usług zwierzęcych.** — Why parked: PRD §Non-Goals — ekosystem zaplanowany jako post-MVP.
- **Obsługa zwierząt innych niż psy.** — Why parked: PRD §Non-Goals — po weryfikacji hipotezy produktowej.

## Milestone History

(Pusta na pierwszym milestone.)

## Done

- **S-01: użytkownik może utworzyć i edytować swój profil właściciela (imię, zdjęcie, dzielnica/miasto).** — Archived 2026-09-24 → `context/archive/2026-09-23-owner-profile/`. Lesson: —.
