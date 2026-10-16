-- Move private profile location off `profiles` (which any authenticated user can read
-- column-for-column via the Data API) into an owner-only `profile_locations` table, and
-- run geographic discovery through a SECURITY DEFINER RPC that returns only public owner
-- IDs. After this, a non-owner's direct `select *` on another profile cannot return a
-- street or precise GPS. RLS filters rows, not columns — a separate owner-only table is
-- what actually hides the columns.

create extension if not exists unaccent;

-- ============================================================
-- city_centers: public reference data for the server-side discovery fallback
-- (mirrors src/lib/geo.ts CITY_CENTERS). `norm` is computed with the same expression
-- the RPC uses to match a profile's city, so seed and lookup always agree.
-- ============================================================
create table if not exists city_centers (
  city text primary key,
  norm text not null,
  lat double precision not null,
  lng double precision not null
);

insert into city_centers (city, norm, lat, lng) values
  ('Warszawa',    lower(unaccent('Warszawa')),    52.2297, 21.0122),
  ('Kraków',      lower(unaccent('Kraków')),      50.0647, 19.945),
  ('Wrocław',     lower(unaccent('Wrocław')),     51.1079, 17.0385),
  ('Poznań',      lower(unaccent('Poznań')),      52.4064, 16.9252),
  ('Gdańsk',      lower(unaccent('Gdańsk')),      54.352,  18.6466),
  ('Łódź',        lower(unaccent('Łódź')),        51.7592, 19.456),
  ('Katowice',    lower(unaccent('Katowice')),    50.2649, 19.0238),
  ('Lublin',      lower(unaccent('Lublin')),      51.2465, 22.5684),
  ('Białystok',   lower(unaccent('Białystok')),   53.1325, 23.1688),
  ('Szczecin',    lower(unaccent('Szczecin')),    53.4285, 14.5528),
  ('Rzeszów',     lower(unaccent('Rzeszów')),     50.0413, 21.999),
  ('Tyczyn',      lower(unaccent('Tyczyn')),      49.9686, 22.0286),
  ('Chmielnik',   lower(unaccent('Chmielnik')),   49.9939, 22.1089),
  ('Borek Stary', lower(unaccent('Borek Stary')), 49.9497, 22.0286),
  ('Kielanówka',  lower(unaccent('Kielanówka')),  50.028,  21.933)
on conflict (city) do nothing;

alter table city_centers enable row level security;

-- Public reference data: any authenticated user may read it (carries no private data).
drop policy if exists city_centers_select_authenticated on city_centers;
create policy city_centers_select_authenticated
  on city_centers
  for select
  to authenticated
  using (true);

-- Explicit least-privilege grants. Supabase grants table rights to anon/authenticated by
-- default; make the intent durable: anon gets no rights at all, authenticated may only
-- read (nobody writes this reference data through the API). RLS and grants are two
-- independent layers — both must agree. service_role keeps its own grant (server-only).
revoke all on table city_centers from public, anon, authenticated;
grant select on table city_centers to authenticated;

-- ============================================================
-- profile_locations: the owner's private location, readable/writable ONLY by the owner.
-- ============================================================
create table if not exists profile_locations (
  profile_id uuid primary key references profiles (id) on delete cascade,
  district text,
  location_lat double precision,
  location_lng double precision,
  updated_at timestamptz not null default now()
);

drop trigger if exists profile_locations_set_updated_at on profile_locations;
create trigger profile_locations_set_updated_at
  before update on profile_locations
  for each row
  execute function set_updated_at();

alter table profile_locations enable row level security;

-- Owner-only across every operation. Non-owners cannot even read the row, so the
-- private columns never reach the Data API for anyone but their owner.
drop policy if exists profile_locations_select_own on profile_locations;
create policy profile_locations_select_own
  on profile_locations for select to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists profile_locations_insert_own on profile_locations;
create policy profile_locations_insert_own
  on profile_locations for insert to authenticated
  with check (profile_id = (select auth.uid()));

drop policy if exists profile_locations_update_own on profile_locations;
create policy profile_locations_update_own
  on profile_locations for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists profile_locations_delete_own on profile_locations;
create policy profile_locations_delete_own
  on profile_locations for delete to authenticated
  using (profile_id = (select auth.uid()));

-- Explicit least-privilege grants. RLS already scopes every row to its owner; these make
-- sure anon has no table rights whatsoever and authenticated carries only the CRUD the
-- owner path needs. service_role keeps its own grant (bypasses RLS, server-only).
revoke all on table profile_locations from public, anon, authenticated;
grant select, insert, update, delete on table profile_locations to authenticated;

-- ============================================================
-- Move existing data, then drop the private columns from profiles.
-- ============================================================
insert into profile_locations (profile_id, district, location_lat, location_lng)
  select id, district, location_lat, location_lng
  from profiles
  where district is not null or location_lat is not null or location_lng is not null
  on conflict (profile_id) do nothing;

alter table profiles
  drop column if exists district,
  drop column if exists location_lat,
  drop column if exists location_lng;

-- ============================================================
-- discoverable_owner_ids: owners within `radius_km` of the caller, as public IDs only.
-- SECURITY DEFINER so it can read every owner's position (profile_locations is otherwise
-- owner-only) WITHOUT returning any coordinate. Anchored internally on (select auth.uid())
-- so it cannot be used to measure distance from an arbitrary user's private pin.
-- Replicates withinDiscoveryRadius: position = saved pin, else city center; null anchor
-- shows everyone; an owner with no resolvable position is dropped once the caller has one.
-- ============================================================
create or replace function public.discoverable_owner_ids(radius_km double precision default 75)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with pos as (
    select p.id,
           coalesce(pl.location_lat, cc.lat) as lat,
           coalesce(pl.location_lng, cc.lng) as lng
    from profiles p
    left join profile_locations pl on pl.profile_id = p.id
    left join city_centers cc on cc.norm = lower(unaccent(coalesce(p.city, '')))
  ),
  anchor as (
    select lat, lng from pos where id = (select auth.uid())
  )
  select pos.id
  from pos, anchor
  where pos.id <> (select auth.uid())
    and (
      anchor.lat is null
      or (
        pos.lat is not null
        and 2 * 6371 * asin(sqrt(
          power(sin(radians(pos.lat - anchor.lat) / 2), 2)
          + cos(radians(anchor.lat)) * cos(radians(pos.lat))
            * power(sin(radians(pos.lng - anchor.lng) / 2), 2)
        )) <= radius_km
      )
    );
$$;

-- Functions default to EXECUTE for PUBLIC, which would let an anon caller run this: with
-- no JWT the anchor is null, and a null anchor returns *every* owner id — i.e. anon could
-- enumerate the whole owner set. Revoke the PUBLIC/anon default, grant EXECUTE only to
-- authenticated. SECURITY DEFINER still never returns a coordinate (IDs only).
revoke all on function public.discoverable_owner_ids(double precision) from public, anon;
grant execute on function public.discoverable_owner_ids(double precision) to authenticated;
