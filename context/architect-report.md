# Raport Architekta (two-pager) — PawMeet

> **Przejrzany: 2026-10-16 · zaktualizowany: 2026-10-17** (dopełniony zestaw DDD L5).
> Raport pod odznakę 10xArchitect — komentarze autorskie wpisane i zaakceptowane; fakty
> zakotwiczone w kodzie (`plik:linia`) i w 4 artefaktach.
> branch `feat/discovery-location-tweaks` · HEAD 0454bce
>
> Artefakty źródłowe:
> 1. Mapa repo (L2): `context/map/repo-map.md`
> 2. Research (L3): `context/changes/walk-invitations-architecture/research.md`
> 3. Plan refaktoryzacji (L4): `context/changes/walk-invitations-architecture/plan.md`
> 4. Notatki DDD (L5): zestaw `context/domain/` — `01-domain-distillation.md`,
>    `glossary.md`, `02-invariant-aggregate-refactor.md`, `03-anti-corruption-layer.md`
>    (+ pogłębiona notatka per-kontekst `invitation.md`)

---

## 1. Mapa repozytorium — gdzie mieszka biznes (L2)

PawMeet to aplikacja (Astro 7 SSR + React 19 + Supabase, Cloudflare Workers) dla
właścicieli psów. Zbudowany rdzeń to umawianie wspólnych spacerów psów i budowanie
grup psów (pack). W bliższych planach: miejsca przyjazne psom i ciekawe miejsca na
spacer. Szukanie partnerów do rozmnażania to dalszy horyzont — w kodzie istnieje tylko
scaffold `type='breeding'` (bez flow, issues #6–#9 jako backlog `status:proposed`).
Mapę zbudowałem metodą *Wide Scan* (`/10x-repo-map`): cztery równoległe sub-agenty
zebrały dowody z historii gita, forge'a (gh), grafu importów i autorstwa — bez czytania
kodu „na oko". Jednostką analizy jest **zdolność biznesowa**, nie folder.

Ranking criticality × buzz wskazał dwie **strefy ryzyka**:
- **map-location** — najgorętsza i najwrażliwsza (prywatność lokalizacji; 24% commitów (7/29)
  to fixy logiki/bezpieczeństwa; re-land PR #19≡#20).
- **walk-invitations** — maszyna stanów z 28% fixów (7/25) i jedynym w repo audytem observability.

Nośny, ale spokojny hub to `auth-access`/`supabase.ts` (importowany przez 23 pliki).
Ograniczenia mapy są jawne: historia zsquashowana do jednego dnia (brak trendu),
projekt jednoosobowy (własność = baseline), PR-y bez review, graf liczony regexem.

**Decyzja:** jako rdzeń dalszej pracy wybrałem **walk-invitations** — najbogatszą
domenowo maszynę stanów ze strefy ryzyka, idealną pod research, plan i model DDD.

> **Mój komentarz:** Ranking mnie nie zaskoczył — obie strefy czułem jako gorące.
> Wybrałem walk-invitations, bo to maszyna stanów z jasnymi regułami przejść, czyli
> najwięcej do nazwania w modelu domeny; map-location jest równie ważna, ale to głównie
> UI i prywatność współrzędnych, mniej czystej logiki domenowej.

## 2. Research ficzera — jak działa maszyna stanów (L3)

Research (`/10x-research`, 3 sub-agenty + inspekcja rdzenia w głównym kontekście)
ustalił model i rozkład invariantów zaproszenia:

- 3 stany `pending | accepted | declined`; jedno przejście `pending → accepted|declined`;
  brak cancel/re-open. „Spotkanie" nie ma osobnej tabeli — to zaproszenie ze
  `status='accepted'` (`src/lib/services/invitation.ts:135-148`).
- Invarianty rozłożone na **DB / serwis / API** z niejednolitą dyscypliną. Najmocniejsze
  żyją w bazie (RLS + trigger `enforce_invitation_update` + constrainty).

Kluczowy moment researchu to **rozstrzygnięcie konfliktu dowodów**: jeden sub-agent
uznał, że re-flip stanów terminalnych jest niezabezpieczony — ale po przeczytaniu
źródła migracji `20261014090001_harden_consent_rls.sql:77,91-92` okazało się, że blokada
JEST (RLS `status='pending'` + trigger `old.status <> 'pending'`). To nie luka. Realne
słabości to: (1) dwa współistniejące triggery update (stary nie usunięty),
(2) invarianty jednowarstwowe (własność psa tylko w serwisie; data/współrzędne tylko w
zod), (3) duplikat-pending wychodzi jako surowy 500, (4) pięć egzekwowanych invariantów
bez testu (duplikat-pending, własność psa, self-invite, odmowa update przez nie-receivera, przeszła data).

> **Mój komentarz:** Zaskoczyło mnie, jak nierówno invarianty są rozłożone — najmocniejsze
> siedzą w bazie, a część reguł wisi tylko w jednej warstwie. DB-first uznaję za świadomą
> dyscyplinę (RLS + triggery jako twarda granica), ale te jednowarstwowe miejsca to już
> niedopatrzenie, nie decyzja — i właśnie je domyka plan.

## 3. Plan refaktoryzacji — co i dlaczego zmienić (L4)

Plan (`/10x-plan`, złożoność MEDIUM) jest przyrostowy i zachowuje zachowanie (zielony
suite po każdej fazie — to strefa ryzyka). Kluczowe decyzje:

| Decyzja | Wybór | Dlaczego |
|---|---|---|
| Zakres DDD | lekki model domeny (typ stanów + funkcja przejścia + zdarzenia) | usuwa literały, testowalne, wobec konwencji cienkich serwisów |
| Warstwa DB | DROP redundantnego triggera + CHECK lat/lng | defense-in-depth bez ruszania działających reguł |
| Duplikat-pending | mapuj na 409 | lepszy UX i observability, DB zostaje twardym guardem |
| Testy | 5 kluczowych invariantów + unit przejścia | dowodzi invariantów |

Pięć faz: (1) model domeny → (2) invarianty serwis/API → (3) backstop DB →
(4) testy → (5) notatki DDD. Świadomie POZA zakresem: pełny agregat z repozytorium,
osobna tabela `meetings`, flow hodowlany, zmiany UI.

Gdybym miał zrobić jeden ruch — **faza 1 (model domeny)**: likwiduje rozsiane literały
stanów, od których zależą wszystkie pozostałe fazy, i daje testowalny rdzeń w izolacji.

> **Mój komentarz:** Najtrudniejsza była skala DDD — kusiło, żeby zrobić pełny agregat,
> ale przy cienkich serwisach i Supabase lekki model jest uczciwszy. Niczego nie odkładam;
> jedyne, co bym w przyszłości poszerzył, to audyt przejść (obserwowalność), gdy zaproszeń będzie więcej.

## 4. Model domeny (DDD) — język, agregat, granice (L5)

Zestaw notatek `context/domain/` destyluje domenę przekrojowo: **destylacja**
(`01-domain-distillation.md`) klasyfikuje poddomeny na rdzeń (walk-invitations,
pack-connections, discovery) / wsparcie / generyczne; **słownik** (`glossary.md`) ustala
język ubikwistyczny i szwy nazewnicze DB↔domena; **invarianty i agregaty**
(`02-invariant-aggregate-refactor.md`) spinają reguły defense-in-depth z refaktorem L4;
**ACL** (`03-anti-corruption-layer.md`) opisuje granicę tłumaczenia na styku Supabase/auth
(snake→camel, `district→street`, foreign-read seam, RPC geo). Pogłębiona notatka
per-kontekst `invitation.md` nazywa agregat rdzenia:
- **Ubikwistyczny język:** sender, receiver, invitation, type (walk/breeding), status,
  meeting (= accepted invitation), pending guard.
- **Agregat `Invitation`:** korzeń = wiersz `invitations`; pola niezmienne (id, uczestnicy,
  type, created_at) vs jedyny mutowalny `status` (tylko `pending → terminal`).
- **Zdarzenia:** InvitationSent / Accepted / Declined (dziś niejawne).
- **Granice kontekstu:** zaproszenie startuje z profilu na mapie; czat „w dół" jest
  bramkowany przez *pack-connections* (consent), nie przez samo zaproszenie;
  *pack-connections* ma bliźniaczą maszynę stanów — ten sam wzorzec consent, inny agregat.

**Świadome decyzje architektoniczne:** meeting jako widok (nie encja), `breeding`
scaffoldowany pod S-08, dyscyplina DB-first.

> **Mój komentarz:** „Meeting jako widok" obronię na dziś — spotkanie to po prostu
> zaakceptowane zaproszenie i nie ma własnego cyklu życia. Granicę przesunąłbym dopiero,
> gdy dojdzie planowanie, odwoływanie albo zmiana terminu — wtedy Meeting zasłuży na własny agregat.

## Wnioski i obrona

- Praca jest **oparta na dowodach**, nie na intuicji: każdy wniosek ma kotwicę `plik:linia`,
  a konflikt dowodów rozstrzygnąłem czytając źródło, nie ufając pojedynczemu agentowi.
- Plan **nie re-litiguje** decyzji już settled (3 stany, brak cancel, type pod S-08) —
  skupia się na realnym długu (redundancja, warstwy jednopunktowe, UX błędu, testy).
- Model domeny jest **lustrem reguł DB**, nie nowym autorytetem — szanuje architekturę
  DB-first zamiast narzucać ciężki agregat.

Otwarte wątki warte dalszej architektury: wspólny wzorzec „consent state machine"
(Invitation + PackConnection), osobny agregat *Meeting* przy planowaniu/odwoływaniu
spotkań, oraz model zdarzeń + audyt przejść (obserwowalność).
