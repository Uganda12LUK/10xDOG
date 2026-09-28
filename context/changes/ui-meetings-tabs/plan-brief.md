# Meetings Screen — Tabs — Plan Brief

> Full plan: `context/changes/ui-meetings-tabs/plan.md`

## What & Why

Ekran `/meetings` wyświetla dziś płaską listę zaakceptowanych spotkań bez możliwości podglądu wysłanych propozycji. Przebudowujemy go na widok z zakładkami i FAB, żeby użytkownik widział stan wszystkich swoich interakcji w jednym miejscu.

## Starting Point

`src/pages/meetings/index.astro` renderuje `<ul>` z accepted meetings. Serwis `listSentPending` istnieje, ale nie jest używany na tej stronie. Brak shadcn `tabs` i `badge`.

## Desired End State

Strona `/meetings` wyświetla trzy zakładki: **Nadchodzące** (accepted meetings), **Moje propozycje** (sent pending), **Historia** (placeholder). FAB `+` w prawym dolnym rogu prowadzi do `/meetings/new`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Nadchodzące vs Historia split | Wszystkie accepted = Nadchodzące; Historia pusta | Brak pola scheduledAt w schemacie — podział po dacie byłby mylący |
| FAB zachowanie | Link href=/meetings/new | Poprawna semantyka; 404 akceptowalne do czasu budowy strony |
| MeetingCard lokalizacja | Inline sub-komponent w MeetingsView.tsx | Nie jest współdzielony — osobny plik to przedwczesna abstrakcja |
| profileMap serializacja | Record<string, {name}> | Map nie przechodzi przez granicę Astro→React |

## Scope

**In scope:**
- `npx shadcn@latest add tabs badge`
- `src/components/meetings/MeetingsView.tsx` (Tabs, MeetingCard inline, FAB)
- Aktualizacja `src/pages/meetings/index.astro` (dodanie listSentPending, podmiana HTML)

**Out of scope:**
- Strona `/meetings/new`
- Anulowanie propozycji z zakładki Moje propozycje
- Podział Nadchodzące/Historia po dacie (brak scheduledAt)
- Paginacja

## Architecture / Approach

SSR frontmatter fetchuje `listAcceptedMeetings` + `listSentPending` równolegle, buduje `profilesObj: Record<string, {name}>`, przekazuje do `<MeetingsView client:load />`. Zakładki obsługiwane client-side przez shadcn Tabs. Wzorzec identyczny z `OwnersMapView` — Astro SSR + React island.

## Phases at a Glance

| Phase | Co dostarcza | Główne ryzyko |
| --- | --- | --- |
| 1. Dependencies | `tabs.tsx` + `badge.tsx` z shadcn | Konflikt wersji shadcn |
| 2. MeetingsView Component | Komponent z Tabs, MeetingCard, FAB | Pozycjonowanie FAB nad BottomNav |
| 3. Page Wiring | Działający ekran z danymi | Serializacja profileMap Astro→React |

**Prerequisites:** ui-tokens-nav ukończony (BottomNav już działa).
**Estimated effort:** ~1 sesja, 3 fazy.

## Open Risks & Assumptions

- Historia zakładka będzie zawsze pusta do momentu dodania `scheduledAt` do schematu.
- `/meetings/new` nie istnieje — FAB prowadzi do 404.

## Success Criteria (Summary)

- Ekran `/meetings` wyświetla 3 zakładki, które można przełączać.
- Zakładka Nadchodzące pokazuje zaakceptowane spotkania, Moje propozycje — wysłane oczekujące.
- FAB widoczny na mobile powyżej BottomNav, nie zakrywa nawigacji.
