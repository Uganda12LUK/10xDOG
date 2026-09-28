---
change_id: testing-bootstrap-critical-path
title: Phase 1 integration tests — bootstrap and critical-path coverage
status: implementing
created: 2026-09-28
updated: 2026-09-28
archived_at: null
---

## Notes

Open a change folder for rollout Phase 1 of context/foundation/test-plan.md: "Bootstrap + critical-path integration".
Risks covered: #1 (walk invitation loop fails end-to-end), #2 (auth gating regression), #3 (meeting state machine inconsistency).
Test types planned: integration.
Risk response intent:
- Risk #1: prove User B receives and can act on User A's invitation; after accepting, meeting appears in both parties' tabs.
- Risk #2: prove unauthenticated GET to each protected route returns a redirect, not page content.
- Risk #3: prove meetings tab shows zero rows for pending/declined invitation; shows one row only after both accept.
