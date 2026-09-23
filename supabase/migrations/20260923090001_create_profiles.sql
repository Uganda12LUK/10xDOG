-- create the profiles table: a 1:1 owner profile keyed to the auth user.
-- establishes the granular-RLS convention the rest of the roadmap depends on.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  district text,
  city text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- keep updated_at fresh on every row update.
create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

-- enable row level security with granular per-operation policies.
alter table profiles enable row level security;

-- any authenticated user can read profiles (profiles are visible only to logged-in users).
create policy profiles_select_authenticated
  on profiles
  for select
  to authenticated
  using (true);

-- a user may only insert their own profile row.
create policy profiles_insert_own
  on profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- a user may only update their own profile row.
create policy profiles_update_own
  on profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- no delete policy: deleting profiles is out of scope for this phase.
