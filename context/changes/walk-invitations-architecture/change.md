---
change_id: walk-invitations-architecture
title: Walk-invitations architecture — research + refactoring plan for the 10xArchitect badge
status: implementing
created: 2026-10-16
updated: 2026-10-17
archived_at: null
---

## Notes

Rdzeń artefaktów odznaki 10xArchitect. Ficzer: maszyna stanów zaproszeń na spacer (`src/lib/services/invitation.ts`, `src/pages/api/invitations/*`, tabela `invitations`). Strefa ryzyka #2 z `context/map/repo-map.md` (28% fixów, jedyny audyt observability). Tu powstaną: research L3 (`research.md`) i plan refaktoryzacji L4 (`plan.md`); notatki DDD L5 trafią do `context/domain/`.

## Status weryfikacji (2026-10-17)

**Komplet artefaktów odznaki (L2–L5) gotowy i wzajemnie skrzyżowany** — zweryfikowany jako
spójny zestaw, nie przez wykonanie kodu:
- L2 mapa `context/map/repo-map.md` · L3 `research.md` · L4 `plan.md` (+ `plan-brief.md`)
- L5 zestaw DDD `context/domain/`: `01-domain-distillation.md`, `glossary.md`,
  `02-invariant-aggregate-refactor.md`, `03-anti-corruption-layer.md`, `invitation.md`
- Raport two-pager `context/architect-report.md` cytuje wszystkie powyższe (HEAD 0454bce).

**Zakres kodu planu (fazy 1–4) jest ŚWIADOMIE niezaimplementowany.** Dla odznaki
10xArchitect dostarczalnym jest *plan* refaktoryzacji, nie jego wykonanie — `plan.md` ma
być obronny, nie wdrożony. Moduł `src/lib/domain/invitation.ts` i migracja porządkowa
pozostają propozycją (patrz `02-invariant-aggregate-refactor.md` § „refaktor NIE
zaimplementowany"). Faktyczna maszyna stanów działa i jest przetestowana w obecnej
postaci (DB-first: RLS + triggery + 17/17 test:rls).
