-- create the dogs table: a dog entity, many per user, keyed by its own id.
-- owner_id FKs the auth user; mirrors the granular-RLS convention from profiles.

create table dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  breed text not null,
  birthdate date,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- index owner_id for list-by-owner queries.
create index dogs_owner_id_idx on dogs (owner_id);

-- index breed for future S-07 breeding-partner matching.
create index dogs_breed_idx on dogs (breed);

-- keep updated_at fresh on every row update (reuses the existing set_updated_at()).
create trigger dogs_set_updated_at
  before update on dogs
  for each row
  execute function set_updated_at();

-- enable row level security with granular per-operation policies.
alter table dogs enable row level security;

-- any authenticated user can read dogs (visible only to logged-in users).
create policy dogs_select_authenticated
  on dogs
  for select
  to authenticated
  using (true);

-- a user may only insert dogs they own.
create policy dogs_insert_own
  on dogs
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

-- a user may only update their own dogs.
create policy dogs_update_own
  on dogs
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- a user may only delete their own dogs.
create policy dogs_delete_own
  on dogs
  for delete
  to authenticated
  using (auth.uid() = owner_id);
