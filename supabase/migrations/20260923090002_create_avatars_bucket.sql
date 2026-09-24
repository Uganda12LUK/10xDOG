-- create the avatars storage bucket for owner (and later dog) photos.
-- any authenticated user can read; only the owning user can write to their own path prefix.
-- object naming convention: <auth-uid>/avatar.<ext>

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- any authenticated user can read avatar objects.
create policy avatars_select_authenticated
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'avatars');

-- a user may only insert objects under their own uid folder prefix.
create policy avatars_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- a user may only update objects under their own uid folder prefix.
create policy avatars_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
