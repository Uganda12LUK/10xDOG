---
topic: ui-meeting-form
researcher: claude-sonnet-4-6
created: 2026-09-28
last_updated: 2026-09-28
last_updated_by: claude-sonnet-4-6
last_updated_note: initial research
---

# Research: ui-meeting-form

## Summary

`/meetings/new` page does not exist. The invitation data model and API are already complete; the form only needs to collect `receiver_id` + `type`. Dog selection and date/time require schema migration if added. The "mini mapa" from the change notes has no backing data — no lat/lng exists anywhere in the schema — and is a **product open question** to resolve before planning.

---

## 1. What already exists

### Invitation service — `src/lib/services/invitation.ts`

All service functions are implemented; none require changes for a basic form:

| Function | Signature | Line |
|---|---|---|
| `sendInvitation` | `(client, senderId, receiverId, type)` → `Invitation` | 27 |
| `hasPendingInvitation` | `(client, senderId, receiverId)` → `boolean` | 45 |
| `listReceivedPending` | `(client, userId)` → `Invitation[]` | 64 |
| `listSentPending` | `(client, userId)` → `Invitation[]` | 78 |
| `respondToInvitation` | `(client, userId, invitationId, response)` → `Invitation` | 120 |

### Invitation API — `src/pages/api/invitations/index.ts`

POST handler accepts `receiver_id` (UUID) and `type` (`"walk" | "breeding"`) via form data. On success redirects to `/owners/{receiver_id}?sent=1`. Zod schema at line 8:

```ts
z.object({ receiver_id: z.uuid(), type: z.enum(["walk", "breeding"]) })
```

**The API does not accept**: dog_id, scheduled_at, location, notes. Adding these requires schema migration AND API change.

### Owner detail page — `src/pages/owners/[id].astro`

Already has a one-click "Send walk invitation" button (line 113–123) with `receiver_id` and hardcoded `type="walk"`. No dog selection, no type choice. This is the current minimal path for sending invitations.

### Dog service — `src/lib/services/dog.ts`

`listDogs(client, ownerId): Promise<Dog[]>` — fetches user's dogs ordered by created_at ASC. Ready to use for dog chip selection.

---

## 2. Data model gaps

### Invitation table — `supabase/migrations/20260926090001_create_invitations.sql`

Current columns: `id`, `sender_id`, `receiver_id`, `type`, `status`, `created_at`, `updated_at`.

**Missing** (would require migration):
- `dog_id` — which of the sender's dogs is attending
- `scheduled_at` — when the meeting is planned
- `location_lat` / `location_lng` — where to meet

### No location data anywhere

Neither `profiles` nor `invitations` stores lat/lng. The `Profile` type (`src/types.ts:1–10`) has `district` and `city` as text fields only. `DogMap.tsx:7–18` exports `CITY_CENTERS` mapping city names to `[lat, lng]` — this is used to center the map display, not to store user locations.

---

## 3. Map component — reuse feasibility

### `src/components/map/DogMap.tsx`

Props: `owners: OwnerWithDogs[]`, `center: [number, number]`, `onOwnerSelect: (id) => void`. Renders owner markers; not designed for location picking or displaying a single point.

Must be wrapped in `client:only="react"` (no SSR guard inside — parent `OwnersMapView.tsx` handles this). Direct import of `leaflet/dist/leaflet.css` (line 4).

**For a mini map on a form**: `DogMap` cannot be reused as-is — it requires owner data. A standalone `<MapContainer>` with a single draggable marker would need a new component. But **there is no location to show or pick** unless `scheduled_at` + lat/lng columns are added.

---

## 4. Current invitation flow (existing, works today)

```
/owners (OwnersMapView) → click marker → BottomSheet → "Zaproponuj spacer" link
    → /owners/{id} (owner detail) → "Send walk invitation" form submit
    → POST /api/invitations (receiver_id + type="walk")
    → redirect /owners/{id}?sent=1
```

The FAB at `/meetings` links to `/meetings/new` (currently 404). The intended flow for `/meetings/new` is unclear: does it pick a receiver from scratch, or does it expect `?receiver_id=` from somewhere?

---

## 5. Unresolved product decisions (must resolve before planning)

| # | Question | Impact |
|---|---|---|
| P1 | **Mini map**: No lat/lng exists. Skip it for MVP, or add location columns to invitations? | Scope: migration required if added; form complexity doubles |
| P2 | **Receiver selection**: Does `/meetings/new` get `?receiver_id=` from URL (e.g., linked from owner detail), or does it include an owner picker? | Determines if DogMap or a search UI is needed |
| P3 | **Dog chip**: Dog selection UI only (no API change), or persist `dog_id` on the invitation (needs migration + API)? | Scope: migration if persisted |
| P4 | **Date/time**: Show a date picker (needs `scheduled_at` column migration), or omit from MVP? | Scope: migration required |
| P5 | **Type selection**: Always show walk+breeding radio, or pre-fill from context (e.g., `?type=walk`)? | Minor UX, no schema impact |

---

## 6. Minimal-scope path (no migrations)

Build `/meetings/new` with **no schema changes**:
- Accept `?receiver_id=` from URL (linked from `/owners/[id].astro`)
- Show receiver name + dog list (read-only, fetched on server)
- Let user select type (walk / breeding)
- Optionally show user's own dog chips (display/select, but NOT sent to API yet)
- Submit to existing `POST /api/invitations` with `receiver_id` + `type`

This replaces the primitive button on `/owners/[id]` with a proper form page while keeping zero schema changes. The FAB on `/meetings` could link to `/owners` instead (where users find receivers) until a standalone owner-picker flow is built.

---

## 7. Files to create / modify

| Action | File |
|---|---|
| CREATE | `src/pages/meetings/new.astro` |
| CREATE | `src/components/meetings/MeetingForm.tsx` |
| POSSIBLY MODIFY | `src/pages/owners/[id].astro` — replace button with link to `/meetings/new?receiver_id={id}` |
| NO CHANGE | `src/pages/api/invitations/index.ts` — already handles POST |
| NO CHANGE | `src/lib/services/invitation.ts` — complete |
| NO CHANGE | `supabase/migrations/` — no migration needed for minimal scope |
