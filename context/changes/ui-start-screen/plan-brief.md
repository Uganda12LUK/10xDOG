# ui-start-screen — Plan Brief

> Full plan: `context/changes/ui-start-screen/plan.md`

## What & Why

Przebudowa ekranu startowego (`/dashboard`) z placeholder'a w mobilny hub aplikacji. Użytkownik po zalogowaniu musi od razu widzieć swojego psa i mieć szybki dostęp do kluczowych akcji — bez nawigacji po menu.

## Starting Point

`dashboard.astro` to aktualnie pusty placeholder z emailem i przyciskiem sign-out. Tokeny, font Inter i BottomNav są już na miejscu (ui-tokens-nav ✓). Oba serwisy danych (`listDogs`, `getProfile`) są gotowe.

## Desired End State

Zalogowany użytkownik widzi: nagłówek „Cześć, {imię}!", kartę pierwszego psa (zdjęcie, rasa, wiek) lub CTA „Dodaj psa" gdy brak, oraz siatkę 6 kafelków szybkich akcji. Dwa kafelki bez gotowych stron mają chip „Wkrótce" i są nieklikalne.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Name fallback | email prefix (przed @) | Zawsze coś personalnego bez dodatkowego onboarding CTA | Plan |
| Brakujące strony | Chip „Wkrótce" + div (nie link) | Brak 404, UI kompletne, czytelne dla użytkownika | Plan |
| Wiek psa | lata + miesiące („2 l. 3 mies.") | Precyzyjne dla szczeniąt, czytelne dla dorosłych psów | Plan |
| Kolejność kafelków | wg design spec | Spójna z oryginalną specyfikacją produktową | Plan |
| Rendering | Czyste Astro SSR | Brak interactivity w tym widoku, zero client JS | Plan |

## Scope

**In scope:**
- `src/lib/age.ts` — nowa funkcja `ageStringFromBirthdate`
- `src/pages/dashboard.astro` — pełny rebuild: header, DogCard (+ fallback), grid 3×2

**Out of scope:**
- Strony `/places` i `/meetings/new` (tworzone przez ich własne slice'y)
- React components — widok jest statyczny
- Sortowanie psów — zawsze pierwszy z listy

## Architecture / Approach

Frontmatter pobiera dane równolegle (`Promise.all`) w SSR. Kafelki to statyczna tablica z flagą `soon: boolean` — warunkowo renderowany `<div>` lub `<a>`. Ikony inline SVG (wzorzec BottomNav.astro). Wszystkie klasy z tokenów: `bg-card`, `shadow-card`, `rounded-xl`, `card-interactive`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Age helper | `ageStringFromBirthdate` w `src/lib/age.ts` | Lokalizacja (polskie odmiany) — rozwiązana przez uproszczony format „l./mies." |
| 2. Dashboard rebuild | Kompletny mobilny ekran startowy | Photo fallback gdy `photoUrl` null — needs `<img>` placeholder |

**Prerequisites:** `ui-tokens-nav` done (shadow-card, card-interactive, BottomNav — ✓)
**Estimated effort:** ~1 sesja (mały zakres, oba serwisy gotowe)

## Open Risks & Assumptions

- `photoUrl` psa może być null — implementacja musi obsłużyć fallback (placeholder div z inicjałem lub szarym tłem)
- `profile.name` może być null — obsłużone przez email prefix

## Success Criteria (Summary)

- Zalogowany użytkownik z psem widzi kartę psa z wiekiem w formacie „X l. Y mies."
- Zalogowany użytkownik bez psa widzi CTA „Dodaj pierwszego psa"
- Kafelki „Zaproponuj spotkanie" i „Miejsca" wyświetlają chip „Wkrótce" i nie dają 404
