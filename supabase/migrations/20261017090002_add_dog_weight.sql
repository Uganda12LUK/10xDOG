-- Approximate adult weight of the dog, in kilograms. Optional (owners may not know
-- it), and used both for display and to classify the dog into a size bucket for the
-- map's size filter (see sizeFromWeight in dogAttributes). A positive, sane upper
-- bound guards against typos; existing rows stay NULL.
alter table dogs
  add column weight_kg numeric(5, 2) check (weight_kg is null or (weight_kg > 0 and weight_kg <= 150));
