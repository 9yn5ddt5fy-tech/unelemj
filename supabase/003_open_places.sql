-- ============================================================================
-- Үнэлэмж · places from OpenStreetMap and places added by guests
--
-- OpenStreetMap data is open (ODbL): we may keep a place's name and address,
-- with "© OpenStreetMap contributors" shown on the page.
-- A guest can also add a place that no map knows yet (5 per network address per day).
-- Run once after 002_google_places.sql.
-- ============================================================================

alter table unelemj.places add column if not exists osm_id text unique
  check (osm_id is null or osm_id ~ '^[NWR][0-9]{1,15}$');
alter table unelemj.places add column if not exists added_by text not null default '';  -- ip hash for guest-added places

-- Create (or find) the place for an OpenStreetMap object, e.g. 'N3912620437'
create or replace function public.ue_ensure_osm_place(p_osm_id text, p_name text, p_category text, p_location text)
returns text language plpgsql security definer set search_path = '' as $$
declare s text := 'o-' || lower(coalesce(p_osm_id, ''));
begin
  if p_osm_id is null or p_osm_id !~ '^[NWR][0-9]{1,15}$' then raise exception 'osm_id'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'name'; end if;
  insert into unelemj.places (slug, name, category, location, osm_id)
  values (s, trim(p_name), left(coalesce(nullif(trim(p_category), ''), 'Бусад'), 40), left(trim(coalesce(p_location, '')), 120), p_osm_id)
  on conflict (slug) do nothing;
  return s;
end $$;

-- A guest adds a place by hand
create or replace function public.ue_add_place(p_name text, p_category text, p_location text)
returns text language plpgsql security definer set search_path = '' as $$
declare ip text := unelemj.client_ip_hash(); s text;
begin
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 80 then raise exception 'name'; end if;
  if char_length(trim(coalesce(p_location, ''))) not between 2 and 120 then raise exception 'location'; end if;
  if (select count(*) from unelemj.places where added_by = ip and created_at > now() - interval '24 hours') >= 5 then raise exception 'too_many'; end if;
  s := 'u-' || left(encode(extensions.gen_random_bytes(8), 'hex'), 12);
  insert into unelemj.places (slug, name, category, location, added_by)
  values (s, trim(p_name), left(coalesce(nullif(trim(p_category), ''), 'Бусад'), 40), trim(p_location), ip);
  return s;
end $$;

-- Every place with its rating (now with name and location for places kept in the database)
drop function if exists public.ue_places();
create or replace function public.ue_places() returns table (slug text, google_id text, osm_id text, name text, category text,
  location text, count bigint, avg numeric, tags json)
language sql stable security definer set search_path = '' as $$
  select p.slug, p.google_id, p.osm_id, p.name, p.category, p.location,
    (select count(*) from unelemj.reviews r where r.place = p.slug and not r.hidden),
    (select round(avg(r.rating)::numeric, 2) from unelemj.reviews r where r.place = p.slug and not r.hidden),
    (select coalesce(json_object_agg(t, n), '{}'::json) from (select t, count(*) n from unelemj.reviews r, unnest(r.tags) t
      where r.place = p.slug and not r.hidden group by t) x)
  from unelemj.places p where p.active
$$;

revoke all on function public.ue_ensure_osm_place(text, text, text, text), public.ue_add_place(text, text, text), public.ue_places() from public;
grant execute on function public.ue_ensure_osm_place(text, text, text, text), public.ue_add_place(text, text, text), public.ue_places() to anon, authenticated;
