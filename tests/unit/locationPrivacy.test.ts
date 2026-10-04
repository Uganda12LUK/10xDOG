import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listDogsForMap } from "@/lib/services/profile";

// Risk #6 (test-plan.md §2): the owners-list / map-pin data must expose only
// district/city text — never lat/lng, a precise address, or a home street.
// listDogsForMap is the single seam that builds the DogWithOwner[] the map and
// the owners API serialize. This test feeds it profile rows that DO carry
// coordinates + district and asserts none of that reaches the pin object, so a
// future change that spreads the whole profile (or adds an ownerLat) fails here
// instead of leaking in production.

const SECRET_LAT = 50.0413;
const SECRET_LNG = 21.999;

const PROFILE_ROWS = [
  {
    id: "owner-1",
    name: "Alice",
    district: "Śródmieście",
    city: "Rzeszów",
    avatar_path: null,
    location_lat: SECRET_LAT,
    location_lng: SECRET_LNG,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const DOG_ROWS = [
  {
    id: "dog-1",
    owner_id: "owner-1",
    name: "Rex",
    breed: "Labrador",
    birthdate: "2022-05-01",
    size: "large",
    traits: ["friendly"],
    photo_path: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

// Minimal thenable query-builder stub: every chained method returns itself, and
// awaiting it resolves to { data, error }. `from(table)` picks the canned rows.
function makeStubClient(): SupabaseClient {
  const builder = (data: unknown) => {
    const b = {
      select: () => b,
      in: () => b,
      eq: () => b,
      neq: () => b,
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        resolve({ data, error: null });
      },
    };
    return b;
  };

  return {
    from: (table: string) => builder(table === "profiles" ? PROFILE_ROWS : DOG_ROWS),
    storage: {
      from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "https://example.test/x.jpg" } }) }),
    },
  } as unknown as SupabaseClient;
}

const FORBIDDEN_KEY = /lat|lng|location|coord|address|street/i;

describe("listDogsForMap — location/PII privacy (risk #6)", () => {
  it("exposes coarse city text but no coordinate/address fields", async () => {
    const dogs = await listDogsForMap(makeStubClient(), "me", "Rzeszów");

    expect(dogs).toHaveLength(1);
    const pin = dogs[0];

    // Coarse location is allowed and expected.
    expect(pin.ownerCity).toBe("Rzeszów");

    // No field name hints at precise location.
    for (const key of Object.keys(pin)) {
      expect(key).not.toMatch(FORBIDDEN_KEY);
    }
  });

  it("does not smuggle the raw coordinates under any key", async () => {
    const dogs = await listDogsForMap(makeStubClient(), "me", "Rzeszów");

    // Name-agnostic leak check: the secret lat/lng must not appear anywhere in
    // the serialized pin, even under an innocuous key.
    const serialized = JSON.stringify(dogs);
    expect(serialized).not.toContain(String(SECRET_LAT));
    expect(serialized).not.toContain(String(SECRET_LNG));
  });
});
