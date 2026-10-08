// Pure, testable core of the dog map search. The map UI stays thin: it builds a
// `DogFilterCriteria` from the filter panel and calls `filterDogs` for both the pins
// and the list, so the two can never disagree. No React / Leaflet imports here.

import type { DogWithOwner } from "@/types";
import type { DogSize } from "@/lib/dogAttributes";
import { CITY_CENTERS, distanceKm } from "@/lib/geo";
import { ageFromBirthdate } from "@/lib/age";

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
 * - maxKm: distance between the user's center and the dog's owner-city center must be
 *   within the limit; a dog whose ownerCity is absent from CITY_CENTERS is excluded only
 *   when a distance limit is active.
 */
export function filterDogs(
  dogs: DogWithOwner[],
  criteria: DogFilterCriteria,
  userCenter: [number, number],
): DogWithOwner[] {
  const { breed, size, traits, ageBucket, maxKm } = criteria;

  return dogs.filter((dog) => {
    if (breed && dog.breed !== breed) return false;
    if (size && dog.size !== size) return false;
    if (traits.length > 0 && !traits.every((t) => dog.traits.includes(t))) return false;

    if (ageBucket) {
      const age = ageFromBirthdate(dog.birthdate);
      if (age === null || !ageInBucket(age, ageBucket)) return false;
    }

    if (maxKm !== null) {
      const center = dog.ownerCity ? CITY_CENTERS[dog.ownerCity] : undefined;
      if (!center || distanceKm(userCenter, center) > maxKm) return false;
    }

    return true;
  });
}
