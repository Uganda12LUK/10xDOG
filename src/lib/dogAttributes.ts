// Single source of truth for the dog discovery attributes. Imported by the dog
// form, the API validation, and the map filter so the vocabulary never drifts.
// Values are stable keys — never localized text. The UI translates them via t()
// using the `size.<key>` and `trait.<key>` i18n keys.

export const DOG_SIZES = ["small", "medium", "large"] as const;
export type DogSize = (typeof DOG_SIZES)[number];

export const DOG_TRAITS = ["energetic", "calm", "social", "shy", "dog_friendly", "kid_friendly"] as const;
export type DogTrait = (typeof DOG_TRAITS)[number];
