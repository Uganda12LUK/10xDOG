// Single source of truth for the dog discovery attributes. Imported by the dog
// form, the API validation, and the map filter so the vocabulary never drifts.
// Values are stable keys — never localized text. The UI translates them via t()
// using the `size.<key>` and `trait.<key>` i18n keys.

export const DOG_SIZES = ["small", "medium", "large"] as const;
export type DogSize = (typeof DOG_SIZES)[number];

// Weight → size classification that connects the dog's recorded weight with the
// map's size filter. Fixed, product-wide thresholds (kg) so the form, the filter,
// and any hint agree: small ≤ 10, medium ≤ 25, large otherwise.
export function sizeFromWeight(weightKg: number | null | undefined): DogSize | null {
  if (weightKg == null || weightKg <= 0) return null;
  if (weightKg <= 10) return "small";
  if (weightKg <= 25) return "medium";
  return "large";
}

export const DOG_TRAITS = [
  // positive / neutral
  "energetic",
  "calm",
  "social",
  "shy",
  "dog_friendly",
  "kid_friendly",
  // cautionary — so a challenging dog can be described honestly and filtered out
  "reactive",
  "anxious",
  "dominant",
  "barky",
] as const;
export type DogTrait = (typeof DOG_TRAITS)[number];
