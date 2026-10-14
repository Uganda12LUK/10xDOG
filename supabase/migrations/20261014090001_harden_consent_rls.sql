-- Harden the pack/invitation consent state machines against RLS bypass.
--
-- Before this migration the INSERT policies only checked the actor
-- (requester/sender = auth.uid()) but not the status, so a requester could insert a
-- row already 'accepted' and unlock 1:1 chat (are_in_pack) without the other party's
-- consent. The UPDATE policies only checked the actor on the NEW row, so the addressee
-- could rewrite participants or re-open a terminal row. RLS WITH CHECK only sees the
-- NEW row, so participant immutability and the legal pending->terminal transition are
-- enforced with a BEFORE UPDATE trigger (which can see OLD); the actor and the
-- insert-time status are enforced in the policies. auth.uid() is wrapped in a scalar
-- subselect per Supabase RLS performance guidance.

-- ============================================================
-- pack_connections
-- ============================================================

-- INSERT: only the requester, and only as a fresh 'pending' request.
drop policy pack_connections_insert_own on pack_connections;
create policy pack_connections_insert_own
  on pack_connections
  for insert
  to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');

-- UPDATE: only the addressee, only while the row is still pending, and the new status
-- must be a terminal decision. Participant immutability and the pending->terminal
-- transition are additionally enforced by the trigger below (it can see OLD).
drop policy pack_connections_update_addressee on pack_connections;
create policy pack_connections_update_addressee
  on pack_connections
  for update
  to authenticated
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (addressee_id = (select auth.uid()) and status in ('accepted', 'declined'));

create or replace function public.enforce_pack_connection_update()
returns trigger
language plpgsql
as $$
begin
  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'pack_connections participants are immutable';
  end if;
  if old.status <> 'pending' then
    raise exception 'pack_connections status is final once decided';
  end if;
  if new.status not in ('accepted', 'declined') then
    raise exception 'pack_connections may only move pending -> accepted/declined';
  end if;
  return new;
end;
$$;

-- Fires before the existing set_updated_at trigger (alphabetical: "enforce" < "set").
create trigger pack_connections_enforce_update
  before update on pack_connections
  for each row
  execute function public.enforce_pack_connection_update();

-- ============================================================
-- invitations
-- ============================================================

drop policy invitations_insert_own on invitations;
create policy invitations_insert_own
  on invitations
  for insert
  to authenticated
  with check (sender_id = (select auth.uid()) and status = 'pending');

drop policy invitations_update_receiver on invitations;
create policy invitations_update_receiver
  on invitations
  for update
  to authenticated
  using (receiver_id = (select auth.uid()) and status = 'pending')
  with check (receiver_id = (select auth.uid()) and status in ('accepted', 'declined'));

create or replace function public.enforce_invitation_update()
returns trigger
language plpgsql
as $$
begin
  if new.sender_id <> old.sender_id or new.receiver_id <> old.receiver_id then
    raise exception 'invitation participants are immutable';
  end if;
  if new.type <> old.type then
    raise exception 'invitation type is immutable';
  end if;
  if old.status <> 'pending' then
    raise exception 'invitation status is final once decided';
  end if;
  if new.status not in ('accepted', 'declined') then
    raise exception 'invitation may only move pending -> accepted/declined';
  end if;
  return new;
end;
$$;

create trigger invitations_enforce_update
  before update on invitations
  for each row
  execute function public.enforce_invitation_update();

-- ============================================================
-- are_in_pack: restrict probing to the caller's own pairs
-- ============================================================
-- SECURITY DEFINER lets this bypass pack_connections RLS for the membership lookup,
-- but it must not let an authenticated user probe whether two *arbitrary* owners are
-- packed. Gate the body so the caller must be one of the two parties. Both messages
-- RLS policies call it with auth.uid() as one argument, so they are unaffected.
create or replace function public.are_in_pack(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (select auth.uid()) in (a, b)
    and exists (
      select 1
      from pack_connections pc
      where pc.status = 'accepted'
        and (
          (pc.requester_id = a and pc.addressee_id = b)
          or (pc.requester_id = b and pc.addressee_id = a)
        )
    );
$$;
