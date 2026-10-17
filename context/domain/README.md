# Domena PawMeet — notatki DDD

Katalog notatek domenowych inspirowanych Domain-Driven Design. Cel: nazwać
ubikwistyczny język, agregaty, invarianty i granice kontekstów produktu, tak by
model był TWÓJ i obronny — nie wygenerowany jednym promptem na wiarę.

Notatki są wyprowadzone z dowodów:
- `context/map/repo-map.md` — mapa zdolności biznesowych (criticality × buzz).
- `context/changes/*/research.md` — pogłębiony research konkretnych ficzerów.
- kodu źródłowego (`src/lib/services/*`, `supabase/migrations/*`, `src/types.ts`).

## Zdolności biznesowe (z mapy repo)

auth-access · dog-profiles · discovery-search · **walk-invitations** · map-location ·
pack-connections · messaging · owner-profile · i18n. (Pełny ranking i strefy ryzyka
w `context/map/repo-map.md`.)

## Konteksty ograniczone (bounded contexts) — szkic

| Kontekst | Rdzeń | Agregaty | Status notatki |
|---|---|---|---|
| **Spotkania (Meetings)** | zaproszenia na spacer, maszyna stanów | `Invitation` | ✅ `invitation.md` |
| Tożsamość i dostęp | auth, sesja, bramkowanie | `Profile` (owner) | — do spisania |
| Psy | profile psów, atrybuty | `Dog` | — do spisania |
| Odkrywanie | filtrowanie/dopasowanie | — (usługa) | — do spisania |
| Lokalizacja i mapa | lokalizacja właściciela, prywatność | `OwnerLocation` | — do spisania |
| Pack i wiadomości | połączenia społeczne (consent), czat | `PackConnection`, `Message` | — do spisania |

Pierwsza notatka dotyczy zdolności ze **strefy ryzyka #2** mapy repo — maszyny stanów
zaproszeń — jako najbogatszego materiału domenowego.

## Zestaw notatek DDD (M4L5)

Przekrojowe analizy domeny (nie per-kontekst):

1. `01-domain-distillation.md` — rdzeń vs wsparcie vs generyczne (gdzie inwestować).
2. `glossary.md` — język ubikwistyczny + szwy nazewnicze DB↔domena.
3. `02-invariant-aggregate-refactor.md` — agregaty, invarianty (defense-in-depth), refaktor L4.
4. `03-anti-corruption-layer.md` — szwy tłumaczenia na granicy Supabase/auth.

Notatka per-kontekst: `invitation.md` (pogłębiony agregat `Invitation`, strefa ryzyka #2).

## Powiązane artefakty odznaki 10xArchitect

1. Mapa repozytorium (L2) → `context/map/repo-map.md`
2. Research ficzera (L3) → `context/changes/walk-invitations-architecture/research.md`
3. Plan refaktoryzacji (L4) → `context/changes/walk-invitations-architecture/plan.md`
4. Notatki domenowe DDD (L5) → **ten katalog** (zestaw M4L5 powyżej + `invitation.md`)
