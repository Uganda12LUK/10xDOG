-- Unread-message support for the Pack chat.
--
-- Marking a message read is the only UPDATE the app performs on `messages`, and it
-- must only ever touch the caller's OWN received, still-unread messages from one
-- sender. Rather than open a broad UPDATE RLS policy on the table (which would also
-- let a receiver rewrite the `body` of messages sent to them), expose a single
-- targeted SECURITY DEFINER function. It is self-scoping via auth.uid(): an anon
-- caller has no uid and updates nothing, and a receiver can only clear the read
-- flag on rows addressed to them. search_path is pinned per definer-function
-- security guidance.
create or replace function public.mark_conversation_read(other uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update messages
  set read_at = now()
  where receiver_id = auth.uid()
    and sender_id = other
    and read_at is null;
$$;
