-- Dog calendar: health and care events for a dog (vaccinations, vet visits, exams,
-- grooming, medication, or anything custom). An event is one-off or recurring; when
-- recurring, it repeats every `recurrence_interval` units of `recurrence` (e.g.
-- recurrence='yearly', interval=1 → once a year). The "next occurrence" is computed
-- in the app from event_date + recurrence, so no trigger/materialization here.
--
-- owner_id is stored alongside dog_id so RLS is a simple owner check; it is set to
-- auth.uid() by the app on insert. Events are private to the owner.

create table dog_events (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references dogs (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  type text not null default 'other'
    check (type in ('vaccination', 'vet_visit', 'exam', 'grooming', 'medication', 'other')),
  event_date date not null,
  recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  recurrence_interval int not null default 1 check (recurrence_interval between 1 and 365),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

-- upcoming-events scans are per owner, ordered by date.
create index dog_events_owner_date_idx on dog_events (owner_id, event_date);
create index dog_events_dog_idx on dog_events (dog_id);

alter table dog_events enable row level security;

-- An owner may fully manage only their own events. Four granular policies so each
-- operation is explicit; the WITH CHECK on insert/update pins ownership to the caller.
create policy dog_events_select_own
  on dog_events for select to authenticated
  using (owner_id = auth.uid());

create policy dog_events_insert_own
  on dog_events for insert to authenticated
  with check (owner_id = auth.uid());

create policy dog_events_update_own
  on dog_events for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy dog_events_delete_own
  on dog_events for delete to authenticated
  using (owner_id = auth.uid());
