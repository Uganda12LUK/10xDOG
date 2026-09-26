-- Prevent receivers from mutating immutable invitation columns.
-- Only `status` may be changed via the receiver update path, and only to
-- 'accepted' or 'declined' (never back to 'pending').

create or replace function guard_invitation_update()
returns trigger
language plpgsql
as $$
begin
  if new.id          <> old.id          then raise exception 'id is immutable'; end if;
  if new.sender_id   <> old.sender_id   then raise exception 'sender_id is immutable'; end if;
  if new.receiver_id <> old.receiver_id then raise exception 'receiver_id is immutable'; end if;
  if new.type        <> old.type        then raise exception 'type is immutable'; end if;
  if new.created_at  <> old.created_at  then raise exception 'created_at is immutable'; end if;
  if new.status not in ('accepted', 'declined') then
    raise exception 'status may only be set to accepted or declined';
  end if;
  return new;
end;
$$;

create trigger invitations_guard_update
before update on invitations
for each row
execute function guard_invitation_update();
