-- 1:1 chat messages, unlocked only between owners who are in the same pack
-- (an accepted pack_connections row in either direction). v1 is text-only and
-- delivered via send + refetch (no Realtime yet) — see context/foundation/shape-notes.md.

-- Pack-membership check used by the messages RLS policies. SECURITY DEFINER so the
-- EXISTS lookup is not itself filtered by pack_connections RLS (which would make the
-- policy depend on the caller being a row participant twice over). STABLE + pinned
-- search_path per Postgres security guidance for definer functions.
create or replace function public.are_in_pack(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from pack_connections pc
    where pc.status = 'accepted'
      and (
        (pc.requester_id = a and pc.addressee_id = b)
        or (pc.requester_id = b and pc.addressee_id = a)
      )
  );
$$;

create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_not_self check (sender_id <> receiver_id)
);

-- index the directional pair for conversation-thread reads.
create index messages_pair_idx on messages (sender_id, receiver_id, created_at);

-- index receiver for unread/inbox scans.
create index messages_receiver_idx on messages (receiver_id, created_at);

-- enable row level security.
alter table messages enable row level security;

-- a participant may read a message only while the two parties are in the same pack.
create policy messages_select_pack
  on messages
  for select
  to authenticated
  using (
    (sender_id = auth.uid() or receiver_id = auth.uid())
    and public.are_in_pack(sender_id, receiver_id)
  );

-- a user may only send as themselves, and only to someone in their pack.
create policy messages_insert_pack
  on messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.are_in_pack(auth.uid(), receiver_id)
  );
