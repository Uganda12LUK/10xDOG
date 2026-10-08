import { describe, expect, it } from "vitest";
import { filterDogs, ageInBucket, EMPTY_CRITERIA, type DogFilterCriteria } from "@/lib/dogFilter";
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
    size: overrides.size ?? "medium",
    traits: overrides.traits ?? [],
    photoPath: null,
    photoUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ownerName: overrides.ownerName ?? "Ala",
    ownerCity: overrides.ownerCity ?? "Rzeszów",
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

  it("intersects multiple criteria", () => {
    const result = filterDogs(dogs, criteria({ breed: "Labrador", size: "large", traits: ["calm"] }), RZESZOW_CENTER);
    expect(result.map((d) => d.id)).toEqual(["a"]);
  });
});
