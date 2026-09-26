-- create the invitations table: a state-machine for walk (and future breeding) invitations.
-- the type column keeps this table reusable by S-08 without schema changes.

create table invitations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('walk', 'breeding')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_not_self check (sender_id <> receiver_id)
);

-- index sender_id for outbox queries.
create index invitations_sender_id_idx on invitations (sender_id);

-- index receiver_id for inbox queries.
create index invitations_receiver_id_idx on invitations (receiver_id);

-- partial unique index: at most one pending invitation per (sender, receiver, type).
create unique index invitations_no_duplicate_pending
  on invitations (sender_id, receiver_id, type)
  where status = 'pending';

-- keep updated_at fresh on every row update (reuses the existing set_updated_at()).
create trigger invitations_set_updated_at
  before update on invitations
  for each row
  execute function set_updated_at();

-- enable row level security with granular per-operation policies.
alter table invitations enable row level security;

-- a participant (sender or receiver) may read their own invitations.
create policy invitations_select_participant
  on invitations
  for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- a user may only insert invitations they send.
create policy invitations_insert_own
  on invitations
  for insert
  to authenticated
  with check (sender_id = auth.uid());

-- only the receiver may update an invitation (to accept or decline it).
create policy invitations_update_receiver
  on invitations
  for update
  to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());
