-- seed.sql: local-dev test data only. NOT for production.
-- Run via: npx supabase db reset

insert into auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'alice@example.com',
    crypt('devpassword', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'bob@example.com',
    crypt('devpassword', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  )
on conflict (id) do nothing;

insert into profiles (id, name, district, city)
values
  ('00000000-0000-0000-0000-000000000001', 'Alice', 'Mokotów',  'Warsaw'),
  ('00000000-0000-0000-0000-000000000002', 'Bob',   'Żoliborz', 'Warsaw')
on conflict (id) do nothing;

insert into dogs (id, owner_id, name, breed, birthdate)
values
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'Luna',
    'Labrador Retriever',
    '2022-03-15'
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000002',
    'Max',
    'Labrador Retriever',
    '2021-07-20'
  )
on conflict (id) do nothing;
