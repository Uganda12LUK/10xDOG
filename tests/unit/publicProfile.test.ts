import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicProfile } from "@/lib/services/profile";

// Risk (owner-location-privacy): a foreign profile read must expose only coarse,
// non-identifying fields — never lat/lng, a precise address, or a home street.
// getPublicProfile is the single foreign-read seam. This test feeds it a profile
// row that DOES carry coordinates + district and asserts none of that reaches the
// returned PublicProfile, so a future change that selects `*` or spreads the whole
// row (or maps via mapRow) fails here instead of leaking in production.

const SECRET_LAT = 50.0413;
const SECRET_LNG = 21.999;

const PROFILE_ROW = {
  id: "owner-1",
  name: "Alice",
  district: "Śródmieście",
  city: "Rzeszów",
  avatar_path: "owner-1/avatar.jpg",
  location_lat: SECRET_LAT,
  location_lng: SECRET_LNG,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// Minimal thenable query-builder stub: every chained method returns itself, and
// maybeSingle resolves to { data, error }. `from("profiles")` picks the canned row.
function makeStubClient(): SupabaseClient {
  const builder = (data: unknown) => {
    const b = {
      select: () => b,
      eq: () => b,
      maybeSingle: () => Promise.resolve({ data, error: null }),
    };
    return b;
  };

  return {
    from: () => builder(PROFILE_ROW),
    storage: {
      from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "https://example.test/x.jpg" } }) }),
    },
  } as unknown as SupabaseClient;
}

const FORBIDDEN_KEY = /lat|lng|location|coord|address|street|district/i;

describe("getPublicProfile — foreign-safe narrowed shape (owner-location-privacy)", () => {
  it("exposes city/name but no coordinate/address fields", async () => {
    const result = await getPublicProfile(makeStubClient(), "owner-1");

    expect(result).not.toBeNull();
    if (result === null) throw new Error("expected a profile");

    // Coarse location + name are allowed and expected.
    expect(result.name).toBe("Alice");
    expect(result.city).toBe("Rzeszów");
    expect(typeof result.avatarUrl).toBe("string");

    // No field name hints at precise location.
    for (const key of Object.keys(result)) {
      expect(key).not.toMatch(FORBIDDEN_KEY);
    }
  });

  it("does not smuggle the raw coordinates under any key", async () => {
    const profile = await getPublicProfile(makeStubClient(), "owner-1");

    // Name-agnostic leak check: the secret lat/lng must not appear anywhere in
    // the serialized profile, even under an innocuous key.
    const serialized = JSON.stringify(profile);
    expect(serialized).not.toContain(String(SECRET_LAT));
    expect(serialized).not.toContain(String(SECRET_LNG));
  });
});
