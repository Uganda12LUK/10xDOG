-- rzeszow-testdata.sql
-- Test/demo data for the LIVE Supabase project. Paste into the Supabase SQL editor.
-- NOT a migration, NOT for production. Idempotent (fixed UUIDs + ON CONFLICT).
--
-- What it creates (all relative to your login account):
--   * 5 test owners near Rzeszów (auth.users + profiles, city = 'Rzeszów') each with 1 dog
--   * your profile city set to 'Rzeszów' + a dog for you (Dashboard card)
--   * 3 invitations wired to you, one per Meetings tab:
--       - received pending  -> "Zaproszenia"  (you can Accept/Decline)
--       - sent pending      -> "Propozycje"
--       - accepted          -> "Nadchodzące"
--
-- Re-runnable: safe to paste again; existing rows are left untouched.

-- ─────────────────────────────────────────────────────────────
-- 0. Ensure the ui-meeting-form columns exist on the invitations table.
--    Safe no-op if migration 20260928090001 was already applied to this DB.
--    (S-07 / sendInvitation depends on these, so they must exist regardless.)
-- ─────────────────────────────────────────────────────────────
alter table invitations
  add column if not exists dog_id uuid references dogs (id) on delete set null,
  add column if not exists scheduled_at timestamptz;

-- ─────────────────────────────────────────────────────────────
-- 1. Test owners (auth.users). Minimal rows — these accounts are for
--    display only and are not meant to be logged into.
-- ─────────────────────────────────────────────────────────────
insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'kasia.rzeszow@example.com',  crypt('devpassword', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'marek.rzeszow@example.com',  crypt('devpassword', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'ola.rzeszow@example.com',    crypt('devpassword', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'piotr.rzeszow@example.com',  crypt('devpassword', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'zosia.rzeszow@example.com',  crypt('devpassword', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 2. Owner profiles — all in Rzeszów so they show on your map.
-- ─────────────────────────────────────────────────────────────
insert into profiles (id, name, district, city)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Kasia', 'Śródmieście',  'Rzeszów'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Marek', 'Nowe Miasto',  'Rzeszów'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Ola',   'Baranówka',    'Rzeszów'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Piotr', 'Śródmieście',  'Rzeszów'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'Zosia', 'Pobitno',      'Rzeszów')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 3. One dog per owner. Kasia + Piotr share a breed (Border Collie)
--    so the map's breed filter has something to narrow.
-- ─────────────────────────────────────────────────────────────
insert into dogs (id, owner_id, name, breed, birthdate)
values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Fela', 'Border Collie',        '2022-04-10'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Rex',  'Owczarek niemiecki',   '2021-08-01'),
  ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', 'Nero', 'Labrador retriever',   '2023-02-20'),
  ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000004', 'Luna', 'Border Collie',        '2020-11-05'),
  ('dddddddd-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000005', 'Hera', 'Beagle',               '2022-06-30')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 4. Your own profile: set city to Rzeszów (map centers here + lists the
--    owners above). Creates the profile if you never saved one.
-- ─────────────────────────────────────────────────────────────
insert into profiles (id, name, district, city)
select u.id, coalesce(p.name, 'Ja'), null, 'Rzeszów'
from auth.users u
left join profiles p on p.id = u.id
where u.email = 'majerskiluk@gmail.com'
on conflict (id) do update set city = 'Rzeszów', district = null;

-- ─────────────────────────────────────────────────────────────
-- 5. A dog for you, so the Dashboard shows a dog card.
-- ─────────────────────────────────────────────────────────────
insert into dogs (id, owner_id, name, breed, birthdate)
select 'dddddddd-0000-0000-0000-0000000000ff', u.id, 'Burek', 'Border Collie', '2023-01-05'
from auth.users u
where u.email = 'majerskiluk@gmail.com'
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 6. Invitations, one per Meetings tab (all relative to your account).
-- ─────────────────────────────────────────────────────────────
-- 6a. Received pending -> shows in "Zaproszenia" (Kasia invited you).
insert into invitations (id, sender_id, receiver_id, type, status)
select 'ffffffff-0000-0000-0000-000000000001',
       'aaaaaaaa-0000-0000-0000-000000000001', u.id, 'walk', 'pending'
from auth.users u
where u.email = 'majerskiluk@gmail.com'
on conflict (id) do nothing;

-- 6b. Sent pending -> shows in "Propozycje" (you invited Marek).
insert into invitations (id, sender_id, receiver_id, type, status)
select 'ffffffff-0000-0000-0000-000000000002',
       u.id, 'aaaaaaaa-0000-0000-0000-000000000002', 'walk', 'pending'
from auth.users u
where u.email = 'majerskiluk@gmail.com'
on conflict (id) do nothing;

-- 6c. Accepted -> shows in "Nadchodzące" (you + Ola, scheduled in 3 days).
insert into invitations (id, sender_id, receiver_id, type, status, scheduled_at)
select 'ffffffff-0000-0000-0000-000000000003',
       u.id, 'aaaaaaaa-0000-0000-0000-000000000003', 'walk', 'accepted', now() + interval '3 days'
from auth.users u
where u.email = 'majerskiluk@gmail.com'
on conflict (id) do nothing;
