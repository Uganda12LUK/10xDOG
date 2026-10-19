import { describe, expect, it } from "vitest";
import { filterDogs, ageInBucket, dogMapPosition, EMPTY_CRITERIA, type DogFilterCriteria } from "@/lib/dogFilter";
import { distanceKm } from "@/lib/geo";
import type { DogWithOwner } from "@/types";

// User sits in Rzeszów; Warszawa is ~250 km away (far), Tyczyn is a Rzeszów satellite (near).
const RZESZOW_CENTER: [number, number] = [50.0413, 21.999];

function yearsAgo(years: number, extraMonths = 0): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - extraMonths);
  return d.toISOString().slice(0, 10);
}

function makeDog(overrides: Partial<DogWithOwner>): DogWithOwner {
  return {
    id: overrides.id ?? "d1",
    ownerId: overrides.ownerId ?? "o1",
    name: overrides.name ?? "Rex",
    breed: overrides.breed ?? "Labrador",
    birthdate: overrides.birthdate ?? yearsAgo(5),
    size: overrides.size !== undefined ? overrides.size : "medium",
    weightKg: overrides.weightKg ?? null,
    traits: overrides.traits ?? [],
    photoPath: null,
    photoUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ownerName: overrides.ownerName ?? "Ala",
    ownerCity: overrides.ownerCity ?? "Rzeszów",
    ownerAvatarUrl: overrides.ownerAvatarUrl ?? null,
  };
}

function criteria(partial: Partial<DogFilterCriteria>): DogFilterCriteria {
  return { ...EMPTY_CRITERIA, ...partial };
}

describe("ageInBucket", () => {
  it("classifies ages into the right buckets", () => {
    expect(ageInBucket(0, "puppy")).toBe(true);
    expect(ageInBucket(1, "puppy")).toBe(false);
    expect(ageInBucket(2, "young")).toBe(true);
    expect(ageInBucket(3, "young")).toBe(false);
    expect(ageInBucket(5, "adult")).toBe(true);
    expect(ageInBucket(8, "adult")).toBe(false);
    expect(ageInBucket(10, "senior")).toBe(true);
  });
});

describe("filterDogs", () => {
  const labrador = makeDog({ id: "a", breed: "Labrador", size: "large", traits: ["calm", "social"] });
  const beagle = makeDog({ id: "b", breed: "Beagle", size: "small", traits: ["social", "barky"] });
  const collie = makeDog({ id: "c", breed: "Border Collie", size: "medium", traits: ["energetic"] });
  const dogs = [labrador, beagle, collie];

  it("returns all dogs when no criteria are set", () => {
    expect(filterDogs(dogs, EMPTY_CRITERIA, RZESZOW_CENTER)).toHaveLength(3);
  });

  it("narrows by breed", () => {
    const result = filterDogs(dogs, criteria({ breed: "Beagle" }), RZESZOW_CENTER);
    expect(result.map((d) => d.id)).toEqual(["b"]);
  });

  it("narrows by size", () => {
    const result = filterDogs(dogs, criteria({ size: "medium" }), RZESZOW_CENTER);
    expect(result.map((d) => d.id)).toEqual(["c"]);
  });

  it("derives size from weight when no explicit size is set", () => {
    // size:null so the filter must fall back to the weight bucket
    const tiny = makeDog({ id: "tiny", size: null, weightKg: 5 }); // small (≤10)
    const mid = makeDog({ id: "mid", size: null, weightKg: 20 }); // medium (≤25)
    const big = makeDog({ id: "big", size: null, weightKg: 40 }); // large (>25)
    const pool = [tiny, mid, big];

    expect(filterDogs(pool, criteria({ size: "small" }), RZESZOW_CENTER).map((d) => d.id)).toEqual(["tiny"]);
    expect(filterDogs(pool, criteria({ size: "medium" }), RZESZOW_CENTER).map((d) => d.id)).toEqual(["mid"]);
    expect(filterDogs(pool, criteria({ size: "large" }), RZESZOW_CENTER).map((d) => d.id)).toEqual(["big"]);
  });

  it("prefers the explicit size over the weight-derived one", () => {
    // A 40 kg dog explicitly marked small stays small for the filter.
    const mislabelled = makeDog({ id: "m", size: "small", weightKg: 40 });
    expect(filterDogs([mislabelled], criteria({ size: "small" }), RZESZOW_CENTER).map((d) => d.id)).toEqual(["m"]);
    expect(filterDogs([mislabelled], criteria({ size: "large" }), RZESZOW_CENTER)).toHaveLength(0);
  });

  it("requires ALL selected traits (AND)", () => {
    expect(filterDogs(dogs, criteria({ traits: ["social"] }), RZESZOW_CENTER).map((d) => d.id)).toEqual(["a", "b"]);
    expect(filterDogs(dogs, criteria({ traits: ["social", "barky"] }), RZESZOW_CENTER).map((d) => d.id)).toEqual(["b"]);
  });

  it("filters by age bucket and excludes dogs without a birthdate when active", () => {
    const puppy = makeDog({ id: "p", birthdate: yearsAgo(0, 6) });
    const senior = makeDog({ id: "s", birthdate: yearsAgo(10) });
    const ageless = makeDog({ id: "x", birthdate: null });
    const pool = [puppy, senior, ageless];

    expect(filterDogs(pool, criteria({ ageBucket: "puppy" }), RZESZOW_CENTER).map((d) => d.id)).toEqual(["p"]);
    expect(filterDogs(pool, criteria({ ageBucket: "senior" }), RZESZOW_CENTER).map((d) => d.id)).toEqual(["s"]);
    // ageless dog still shows when the age filter is off
    expect(filterDogs(pool, EMPTY_CRITERIA, RZESZOW_CENTER)).toHaveLength(3);
  });

  it("keeps near dogs and drops far / unknown-city dogs when a distance limit is active", () => {
    const near = makeDog({ id: "near", ownerCity: "Tyczyn" });
    const far = makeDog({ id: "far", ownerCity: "Warszawa" });
    const unknown = makeDog({ id: "unknown", ownerCity: "Atlantyda" });
    const pool = [near, far, unknown];

    const result = filterDogs(pool, criteria({ maxKm: 25 }), RZESZOW_CENTER);
    expect(result.map((d) => d.id)).toEqual(["near"]);
    // without a distance limit everyone shows
    expect(filterDogs(pool, EMPTY_CRITERIA, RZESZOW_CENTER)).toHaveLength(3);
  });

  it("measures distance from each dog's map pin (jitter included), not the bare city center", () => {
    // Regression: the circle the user sees is drawn around the dog *pins*, which
    // carry a stable per-dog jitter (~1–2.5 km) on top of the city center. The old
    // filter measured the bare city center, so two dogs in the SAME city both read
    // 0 km and were kept (or dropped) together — pins could sit inside the circle
    // yet be filtered out. The filter must measure the same jittered pin position.
    const nearPin = makeDog({ id: "beta", ownerCity: "Rzeszów" }); // pin ~1.02 km from center
    const farPin = makeDog({ id: "alpha", ownerCity: "Rzeszów" }); // pin ~2.33 km from center
    const result = filterDogs([nearPin, farPin], criteria({ maxKm: 1.5 }), RZESZOW_CENTER);
    expect(result.map((d) => d.id)).toEqual(["beta"]);
  });

  it("keeps exactly the dogs whose map pin falls within the radius (filter == pins)", () => {
    const pool = [
      makeDog({ id: "beta", ownerCity: "Rzeszów" }),
      makeDog({ id: "alpha", ownerCity: "Rzeszów" }),
      makeDog({ id: "near", ownerCity: "Tyczyn" }),
      makeDog({ id: "far", ownerCity: "Warszawa" }),
      makeDog({ id: "unknown", ownerCity: "Atlantyda" }),
    ];
    const maxKm = 12;
    const kept = filterDogs(pool, criteria({ maxKm }), RZESZOW_CENTER);
    for (const dog of pool) {
      const pos = dogMapPosition(dog);
      const insideCircle = pos !== null && distanceKm(RZESZOW_CENTER, pos) <= maxKm;
      expect(kept.includes(dog)).toBe(insideCircle);
    }
  });

  it("resolves owner-city variants (case/diacritics) the same as the dictionary key", () => {
    // Regression: a diacritic-free "Rzeszow" must match the "Rzeszów" center so the
    // client distance filter agrees with the (normalized) server discovery scope.
    const asciiVariant = makeDog({ id: "ascii", ownerCity: "Rzeszow" });
    const lowerVariant = makeDog({ id: "lower", ownerCity: "rzeszów" });
    const pool = [asciiVariant, lowerVariant];

    // Both sit at the Rzeszów center (0 km from the viewer) → kept under a tight limit.
    const result = filterDogs(pool, criteria({ maxKm: 5 }), RZESZOW_CENTER);
    expect(result.map((d) => d.id)).toEqual(["ascii", "lower"]);
  });

  it("intersects multiple criteria", () => {
    const result = filterDogs(dogs, criteria({ breed: "Labrador", size: "large", traits: ["calm"] }), RZESZOW_CENTER);
    expect(result.map((d) => d.id)).toEqual(["a"]);
  });
});
