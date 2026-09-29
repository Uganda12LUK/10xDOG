ALTER TABLE invitations
  ADD COLUMN dog_id uuid REFERENCES dogs (id) ON DELETE SET NULL,
  ADD COLUMN scheduled_at timestamptz;
