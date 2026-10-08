-- Add an optional meeting location (lat/lng) to invitations so the sender can mark
-- where they want to meet and the receiver can see it. Nullable — existing rows and
-- invitations created without a pin stay valid. Existing RLS policies cover all columns.

ALTER TABLE invitations
  ADD COLUMN location_lat double precision,
  ADD COLUMN location_lng double precision;
