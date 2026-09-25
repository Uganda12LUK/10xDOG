# Contract Surfaces

Load-bearing patterns for PawMeet. Every future slice that adds a table, route, or
migration must follow these conventions — read this before writing any RLS policy
or touching `src/middleware.ts`.

---

## 1. RLS Naming Convention

All tables use granular per-operation, per-role policies. Four policy names per table:

| Policy name                   | Operation | Role          | Condition                              |
| ----------------------------- | --------- | ------------- | -------------------------------------- |
| `<table>_select_authenticated`| SELECT    | authenticated | `using (true)` — any logged-in user    |
| `<table>_insert_own`          | INSERT    | authenticated | `with check (auth.uid() = <owner_col>)`|
| `<table>_update_own`          | UPDATE    | authenticated | `using` + `with check` on `<owner_col>`|
| `<table>_delete_own`          | DELETE    | authenticated | `using (auth.uid() = <owner_col>)`     |

`anon` role gets no policies — anonymous access is always blocked.

Delete may be intentionally omitted (e.g. `profiles` has no delete policy — deleting
profiles is out of scope for MVP). When omitting, add a comment in the migration.

Always precede policies with:
```sql
alter table <table> enable row level security;
```

---

## 2. Ownership Column Convention

Two patterns — choose one per table and document the choice:

| Pattern  | Table     | Owner column | Description                                   |
| -------- | --------- | ------------ | --------------------------------------------- |
| Identity | `profiles`| `id`         | The user IS the row — PK equals `auth.uid()`  |
| Foreign  | `dogs`    | `owner_id`   | The user OWNS the row — FK to `auth.users.id` |

Future tables: use **Foreign** (`owner_id`) for entity tables (meetings, invitations,
etc.). Use **Identity** only for 1:1 user-extension tables like `profiles`.

---

## 3. PROTECTED_ROUTES Pattern

File: `src/middleware.ts:5`

```ts
const PROTECTED_ROUTES = ["/dashboard", "/profile", "/dogs"];
```

Rules:
- Each slice adds its own prefix when it ships its page (not earlier).
- Prefix matching — `/dogs` covers `/dogs`, `/dogs/new`, `/dogs/[id]`.
- The null-client guard (`supabase = null`) sets `context.locals.user = null`,
  which the route-protection block redirects to `/auth/signin`.

---

## 4. Migration Naming Format

```
supabase/migrations/YYYYMMDDHHmmss_short_description.sql
```

Example: `20260923090001_create_profiles.sql`

Every migration must:
1. Enable RLS (`alter table <table> enable row level security`)
2. Apply all four granular policies (or document why one is omitted)
3. Use the ownership column convention from §2
4. Be idempotent-safe (no bare `drop` without `if exists`)
