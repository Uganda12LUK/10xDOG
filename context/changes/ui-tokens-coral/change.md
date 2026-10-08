---
change_id: ui-tokens-coral
title: Design system — Koralowa smycz (coral leash) token palette
status: impl_reviewed
created: 2026-09-26
updated: 2026-09-26
archived_at: null
---

## Notes

Kompletna wymiana palety tokenów z amber shadcn na "Koralową smycz" (Coral leash):
- `--primary: #C4461F` (koral, terra-cotta)
- Pełna paleta hex zamiast oklch, stone-neutral tło, light mode as default
- Nowe tokeny semantyczne: `--success`, `--warning`, plus `.dark` wariant

Zmiany trafiły do working tree globalnie podczas pracy nad meetings-ui-tokens
i zostały wyodrębnione do osobnego change (impl-review F4).

Plik źródłowy: `src/styles/global.css`
