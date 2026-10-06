-- Add an optional home location (lat/lng) to profiles. The owner sets it with a
-- draggable pin; the map centers on it and the dog search is anchored there.
-- Nullable — existing profiles stay valid and fall back to the city center.
-- Existing RLS policies cover all columns.

ALTER TABLE profiles
  ADD COLUMN location_lat double precision,
  ADD COLUMN location_lng double precision;
