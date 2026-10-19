// Pure, testable core of the dog map search. The map UI stays thin: it builds a
// `DogFilterCriteria` from the filter panel and calls `filterDogs` for both the pins
// and the list, so the two can never disagree. No React / Leaflet imports here.

import type { DogWithOwner } from "@/types";
import { sizeFromWeight, type DogSize } from "@/lib/dogAttributes";
import { cityCenter, distanceKm } from "@/lib/geo";
import { ageFromBirthdate } from "@/lib/age";

/**
 * A dog's size for filtering: its explicitly chosen size if set, otherwise the
 * bucket derived from its recorded weight. This is what links the map's size
 * filter to the weight owners enter in the profile.
 */
export function effectiveSize(dog: Pick<DogWithOwner, "size" | "weightKg">): DogSize | null {
  return dog.size ?? sizeFromWeight(dog.weightKg);
}

// Age buckets derived from the dog's birthdate. Chosen to be meaningful to owners
// rather than exact years, and computed with the existing `ageFromBirthdate` helper.
export const AGE_BUCKETS = ["puppy", "young", "adult", "senior"] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

/** True when a dog's integer age (years) falls in the given bucket. */
export function ageInBucket(age: number, bucket: AgeBucket): boolean {
  switch (bucket) {
    case "puppy":
      return age < 1;
    case "young":
      return age >= 1 && age < 3;
    case "adult":
      return age >= 3 && age < 8;
    case "senior":
      return age >= 8;
  }
}

// A stable per-dog jitter so dogs in the same town don't stack on one point but
// spread across the neighbourhood (~±2 km), as if on different streets.
// lat: 1° ≈ 111 km, lng: 1° ≈ 71 km at ~50°N → divisors tuned for ~±2 km each.
function deterministicOffset(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return [((h % 1001) - 500) / 28000, (((h >> 4) % 1001) - 500) / 18000];
}

/**
 * The single source of truth for where a dog sits on the map: its owner-city
 * center (CITY_CENTERS) plus a stable per-dog jitter. Returns null when the
 * owner's city isn't a known center — such a dog has no resolvable position, so
 * it can neither be pinned nor measured by distance. The map (pin placement) and
 * the distance filter both call this, so the circle the user sees and the dogs
 * the filter keeps are the same geometry.
 */
export function dogMapPosition(dog: Pick<DogWithOwner, "id" | "ownerCity">): [number, number] | null {
  const base = cityCenter(dog.ownerCity);
  if (!base) return null;
  const [dlat, dlng] = deterministicOffset(dog.id);
  return [base[0] + dlat, base[1] + dlng];
}

export interface DogFilterCriteria {
  breed: string | null;
  size: DogSize | null;
  traits: string[];
  ageBucket: AgeBucket | null;
  maxKm: number | null;
}

export const EMPTY_CRITERIA: DogFilterCriteria = {
  breed: null,
  size: null,
  traits: [],
  ageBucket: null,
  maxKm: null,
};

/**
 * Narrow `dogs` to those matching every active criterion. A null/empty criterion does
 * not filter. Semantics:
 * - breed / size: exact match when set.
 * - traits: dog must include ALL selected traits (AND).
 * - ageBucket: dog's age (from birthdate) must fall in the bucket; a dog with no/invalid
 *   birthdate is excluded only when the age filter is active.
 * - maxKm: distance between the user's center and the dog's map pin (city center +
 *   per-dog jitter, via `dogMapPosition`) must be within the limit — the same point the
 *   map draws — so a pin inside the circle is never filtered out. A dog whose ownerCity
 *   is absent from CITY_CENTERS has no pin and is excluded only when a limit is active.
 */
export function filterDogs(
  dogs: DogWithOwner[],
  criteria: DogFilterCriteria,
  userCenter: [number, number],
): DogWithOwner[] {
  const { breed, size, traits, ageBucket, maxKm } = criteria;

  return dogs.filter((dog) => {
    if (breed && dog.breed !== breed) return false;
    if (size && effectiveSize(dog) !== size) return false;
    if (traits.length > 0 && !traits.every((t) => dog.traits.includes(t))) return false;

    if (ageBucket) {
      const age = ageFromBirthdate(dog.birthdate);
      if (age === null || !ageInBucket(age, ageBucket)) return false;
    }

    if (maxKm !== null) {
      const pos = dogMapPosition(dog);
      if (!pos || distanceKm(userCenter, pos) > maxKm) return false;
    }

    return true;
  });
}
