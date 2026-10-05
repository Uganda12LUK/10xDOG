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
  add column if not exists scheduled_at timestamptz,
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision;

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
-- 2. Owner profiles — spread across Rzeszów + nearby towns (same discovery
--    region as Rzeszów, see src/lib/geo.ts) so the map shows distinct pins
--    rather than one cluster. DO UPDATE so re-running fixes existing rows.
-- ─────────────────────────────────────────────────────────────
insert into profiles (id, name, district, city)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Kasia', null, 'Tyczyn'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Marek', null, 'Chmielnik'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Ola',   null, 'Borek Stary'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Piotr', 'Śródmieście', 'Rzeszów'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'Zosia', null, 'Kielanówka')
on conflict (id) do update set city = excluded.city, district = excluded.district;

-- ─────────────────────────────────────────────────────────────
-- 3. One dog per owner. Kasia + Piotr share a breed (Border Collie)
--    so the map's breed filter has something to narrow. Sizes, traits and
--    birthdates are spread across buckets so the size / character / age
--    filters each have something to narrow. DO UPDATE so re-running refreshes
--    these attributes on existing demo rows.
-- ─────────────────────────────────────────────────────────────
insert into dogs (id, owner_id, name, breed, birthdate, size, traits)
values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Fela', 'Border Collie',        '2022-04-10', 'medium', array['energetic','dog_friendly']),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Rex',  'Owczarek niemiecki',   '2021-08-01', 'large',  array['energetic','reactive']),
  ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', 'Nero', 'Labrador retriever',   '2023-02-20', 'large',  array['social','kid_friendly']),
  ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000004', 'Luna', 'Border Collie',        '2016-11-05', 'medium', array['calm','social']),
  ('dddddddd-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000005', 'Hera', 'Beagle',               '2024-06-30', 'small',  array['social','barky'])
on conflict (id) do update set birthdate = excluded.birthdate, size = excluded.size, traits = excluded.traits;

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
insert into dogs (id, owner_id, name, breed, birthdate, size, traits)
select 'dddddddd-0000-0000-0000-0000000000ff', u.id, 'Burek', 'Border Collie', '2025-11-01', 'medium', array['energetic']
from auth.users u
where u.email = 'majerskiluk@gmail.com'
on conflict (id) do update set birthdate = excluded.birthdate, size = excluded.size, traits = excluded.traits;

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

-- ─────────────────────────────────────────────────────────────
-- 7. Bulk demo dogs (35) spread across the 5 Rzeszów-area owners, so the map,
--    the scrollable results list, and every filter (breed / size / age /
--    character / distance) have a realistic volume to narrow. Dogs anchor to
--    their owner's town center (see src/lib/geo.ts), so cycling owners spreads
--    them across ~0–11 km from Rzeszów (Rzeszów 0, Kielanówka ~5, Tyczyn ~8.6,
--    Chmielnik ~9.5, Borek Stary ~11) — enough to exercise the 5/10/25 km filter.
--    Deterministic ids + DO UPDATE -> re-runnable, refreshes attributes.
-- ─────────────────────────────────────────────────────────────
insert into dogs (id, owner_id, name, breed, birthdate, size, traits)
select
  ('dddddddd-0000-0000-0000-' || lpad((100 + g)::text, 12, '0'))::uuid,
  (array[
    'aaaaaaaa-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000004',
    'aaaaaaaa-0000-0000-0000-000000000005'
  ]::uuid[])[1 + (g % 5)],
  (array[
    'Max','Luna','Daisy','Rocky','Bella','Czaki','Lola','Bruno','Maja','Dino',
    'Tofik','Nela','Pucek','Zica','Gucio','Kira','Baks','Fibi','Reksio','Puma',
    'Azor','Sonia','Diego','Nuta','Cola','Kajtek','Perła','Figo','Zoja','Boni',
    'Tara','Loki','Misza','Hela','Dixie'
  ])[g],
  (array[
    'Labrador retriever','Golden retriever','Border Collie','Beagle',
    'Owczarek niemiecki','Jack Russell terrier','Cocker spaniel','Buldog francuski',
    'Mops','Husky syberyjski','Shih Tzu','Sznaucer miniaturowy','Yorkshire terrier',
    'Kundelek'
  ])[1 + (g % 14)],
  (date '2015-01-01' + ((g * 137) % 3650)),
  (array['small','medium','large'])[1 + (g % 3)],
  case (g % 8)
    when 0 then array['energetic','social']
    when 1 then array['calm','kid_friendly']
    when 2 then array['social','dog_friendly']
    when 3 then array['shy','anxious']
    when 4 then array['energetic','reactive']
    when 5 then array['calm','dog_friendly','kid_friendly']
    when 6 then array['dominant','barky']
    else array['social','energetic','kid_friendly']
  end
from generate_series(1, 35) g
on conflict (id) do update set
  owner_id = excluded.owner_id, name = excluded.name, breed = excluded.breed,
  birthdate = excluded.birthdate, size = excluded.size, traits = excluded.traits;
