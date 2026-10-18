# 10xChampion — CI/CD code-review agent (M5 wariant A)

Dowód odznaki **10xChampion**: pipeline CI uruchamiający **agenta** code-review, który
analizuje konkretny diff PR i zostawia komentarz na Pull Requeście.

## Co składa się na dowód (wariant A)

| Wymóg M5 | Realizacja |
|---|---|
| Workflow uruchamiający agenta | `.github/workflows/claude-code-review.yml` (`anthropics/claude-code-action@v1`) |
| Analiza konkretnego diffu | Prompt review czyta diff PR + `CLAUDE.md` (RLS, zod, tokeny UI, maszyna zgody) |
| Log działania agenta | Logi joba `review` w zakładce **Actions** danego runu |
| Komentarz agenta na PR | `gh pr comment` (podsumowanie) + inline (`create_inline_comment`) |
| Zrzuty ekranu | Patrz „Zrzuty do zebrania" niżej |

## Jak to działa

- **Trigger:** każdy `pull_request` (opened / synchronize / reopened). Dodatkowo komentarz
  `@claude` na PR wywołuje review na żądanie (`issue_comment`).
- **Auth:** token subskrypcji Claude w sekrecie repo `CLAUDE_CODE_OAUTH_TOKEN` — bez API key,
  bez płatnego API.
- **Uprawnienia:** job dostaje `pull-requests: write` / `issues: write`, by publikować komentarze.
- **Concurrency:** nowy push do PR anuluje poprzedni, niedokończony review.

## Konfiguracja jednorazowa (robi właściciel repo)

1. Wygeneruj token subskrypcji lokalnie:
   ```
   claude setup-token
   ```
2. Dodaj go jako sekret repo (wartość wklejana interaktywnie, nie trafia do logów):
   ```
   gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo Uganda12LUK/10xDOG
   ```
   (albo GitHub → Settings → Secrets and variables → Actions → New repository secret,
   nazwa `CLAUDE_CODE_OAUTH_TOKEN`).

## Zrzuty do zebrania (do formularza bloków dodatkowych)

1. **Pipeline** — zakładka *Actions*, run „Claude Code Review" z widocznym jobem `review`.
2. **Log agenta** — rozwinięty krok „Claude review" w logach runu (widać, że agent czyta diff
   i woła narzędzia GitHub).
3. **Komentarz agenta** — komentarz na PR (podsumowanie i/lub inline) autorstwa bota akcji.

Zrzuty wrzuć do `context/changes/champion-ci-code-review/evidence/` (katalog na screeny).
