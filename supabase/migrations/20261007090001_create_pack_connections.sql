-- "Moje stado" (my pack): a persistent friendship relation between two owners.
-- A owner "throws a bone" (requester -> addressee) which creates a pending row;
-- the addressee "catches the bone" (accepts) to form the mutual connection that
-- unlocks 1:1 chat. Modeled on the invitations state-machine (pending/accepted/declined)
-- and reuses the existing set_updated_at() trigger function.

create table pack_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pack_connections_not_self check (requester_id <> addressee_id)
);

-- index requester_id for "bones I threw" queries.
create index pack_connections_requester_id_idx on pack_connections (requester_id);

-- index addressee_id for "bones to catch" (inbox) queries.
create index pack_connections_addressee_id_idx on pack_connections (addressee_id);

-- partial unique index: at most one pending request per (requester, addressee).
create unique index pack_connections_no_duplicate_pending
  on pack_connections (requester_id, addressee_id)
  where status = 'pending';

-- keep updated_at fresh on every row update (reuses the existing set_updated_at()).
create trigger pack_connections_set_updated_at
  before update on pack_connections
  for each row
  execute function set_updated_at();

-- enable row level security with granular per-operation policies.
alter table pack_connections enable row level security;

-- a participant (requester or addressee) may read their own connections.
create policy pack_connections_select_participant
  on pack_connections
  for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- a user may only insert connections they initiate (throw the bone).
create policy pack_connections_insert_own
  on pack_connections
  for insert
  to authenticated
  with check (requester_id = auth.uid());

-- only the addressee may update a connection (to catch/accept or decline the bone).
create policy pack_connections_update_addressee
  on pack_connections
  for update
  to authenticated
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid());
