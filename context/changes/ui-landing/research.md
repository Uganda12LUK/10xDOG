# Research: ui-landing

## Widok
`src/pages/index.astro` + `src/components/Welcome.astro`

## Źródło tokenów
`src/styles/global.css` — `:root`/`.dark` CSS vars + `@theme inline`

## Komponenty współdzielone w repo
- `src/components/ui/button.tsx`
- `src/components/ui/LibBadge.astro`

## Charge List

### C1 — Missing tokens: Hero gradient z hardkodowanymi kolorami
- **Plik:linia**: `src/components/Welcome.astro:16`
- **Klasy/kod**: `from-blue-200 via-purple-200 to-pink-200`
- **Efekt na użytkownika**: Gradient nie odzwierciedla amber brand color — niebiesko-różowy gradient jest niespójny z design systemem PawMeet.
- **Fix**: Użyć `from-primary via-primary/70 to-accent` lub stworzyć token `--gradient-hero` w global.css.

### C2 — Missing tokens: Hardkodowane kolory przycisków CTA
- **Plik:linia**: `src/components/Welcome.astro:25,31`
- **Klasy/kod**: `bg-purple-600 hover:bg-purple-500`, `border-white/20 hover:bg-white/10`
- **Efekt na użytkownika**: Przyciski nie używają `--primary` tokenu — nie odzwierciedlają amber brand color.
- **Fix**: Użyć `<Button variant="default">` i `<Button variant="outline">` z button.tsx.

### C3 — Missing tokens: Feature cards z hardkodowanymi kolorami
- **Plik:linia**: `src/components/Welcome.astro:40,51,56,62,73,79,85,96,102`
- **Klasy/kod**: `border-white/10`, `bg-white/5`, `text-purple-300`, `text-white`, `text-blue-100/60`
- **Efekt na użytkownika**: Karty nie używają `bg-card`, `border-border`, `text-muted-foreground` — niespójne z resztą design systemu.
- **Fix**: `border-border`, `bg-card`, `text-card-foreground`, `text-muted-foreground`.

### C4 — Missing shared component: CTA buttony budowane ręcznie jako `<a>`
- **Plik:linia**: `src/components/Welcome.astro:23-34`
- **Klasy/kod**: `<a href="..." class="inline-flex items-center justify-center rounded-lg ...">` zamiast `<Button>`
- **Efekt na użytkownika**: Przyciski nie mają consistent focus ring, loading state ani accessibility atrybutów z Button.tsx.
- **Fix**: Użyć `<Button asChild><a href="/auth/signin">Sign In</a></Button>` lub stworzyć Astro wrapper.

### C5 — Accidental architecture: Treść landing page to generyczny starter, nie PawMeet
- **Plik:linia**: `src/components/Welcome.astro:17-20`
- **Klasy/kod**: Tekst "10x Astro Starter", "A production-ready starter with authentication, modern tooling, and a cosmic developer experience."
- **Efekt na użytkownika**: Nowy użytkownik nie rozumie, że to aplikacja do spacerów z psami — brak value proposition produktu.
- **Fix**: Zmienić copy na PawMeet-specific: "PawMeet — znajdź towarzyszy spacerów dla swojego psa"; feature cards: "Organizuj spacery", "Znajdź partnerów do hodowli", "Zapraszaj właścicieli".

### C6 — Missing tokens: LibBadge.astro z hardkodowanymi kolorami
- **Plik:linia**: `src/components/ui/LibBadge.astro:10`
- **Klasy/kod**: `bg-blue-900/50`, `text-blue-200`, `bg-purple-500/30`, `text-purple-200`
- **Efekt na użytkownika**: Badge jest niezgodny z design systemem — wygląda jak komponent ze startera, nie PawMeet.
- **Fix**: `bg-primary/10 text-primary` lub `bg-secondary text-secondary-foreground`.

## Odpowiedź na pytanie architektoniczne

**Zalogowany użytkownik**: Middleware (`src/middleware.ts:29-31`) redirectuje zalogowanych z `/` na `/dashboard`. Landing page widoczna tylko dla niezalogowanych.

**Treść marketingowa**: Welcome.astro zawiera generyczny tekst "10x Astro Starter" — nie ma żadnej wzmianki o psach, spacerach ani społeczności PawMeet. To jest nie-wdrożony placeholder starteru.

**CTA**: Dwa przyciski "Sign In" i "Sign Up" — oba zbudowane ręcznie jako `<a>` z inline klasami zamiast komponentu `<Button>`.
