-- ============================================================================
-- Үнэлэмж · places found through Google search
--
-- A guest can review any place Google Maps knows. The first review creates the
-- place here. Google's terms let us keep the Google place ID for good, but not
-- Google's own content (name, address, photos), so only the ID and our own
-- category are stored; the page reads the rest from Google each time.
-- Run once after 001_reviews.sql.
-- ============================================================================

alter table unelemj.places add column if not exists google_id text unique
  check (google_id is null or google_id ~ '^[A-Za-z0-9_-]{10,255}$');

-- slug for a Google place: "g-" + first 20 hex chars of sha256(place id).
-- The browser computes the same value, so a page can be opened before the place exists.
create or replace function unelemj.google_slug(p_google_id text) returns text language sql immutable as $$
  select 'g-' || left(encode(extensions.digest(p_google_id, 'sha256'), 'hex'), 20)
$$;

-- Create (or find) the place for a Google place ID. Called right before the first review.
create or replace function public.ue_ensure_google_place(p_google_id text, p_category text)
returns text language plpgsql security definer set search_path = '' as $$
declare s text;
begin
  if p_google_id is null or p_google_id !~ '^[A-Za-z0-9_-]{10,255}$' then raise exception 'google_id'; end if;
  s := unelemj.google_slug(p_google_id);
  insert into unelemj.places (slug, name, category, location, google_id)
  values (s, '', left(coalesce(nullif(trim(p_category), ''), 'Бусад'), 40), '', p_google_id)
  on conflict (slug) do nothing;
  return s;
end $$;

-- Every place with its rating, for the home, search and top lists (one call instead of one per place)
create or replace function public.ue_places() returns table (slug text, google_id text, category text,
  count bigint, avg numeric, tags json)
language sql stable security definer set search_path = '' as $$
  select p.slug, p.google_id, p.category,
    (select count(*) from unelemj.reviews r where r.place = p.slug and not r.hidden),
    (select round(avg(r.rating)::numeric, 2) from unelemj.reviews r where r.place = p.slug and not r.hidden),
    (select coalesce(json_object_agg(t, n), '{}'::json) from (select t, count(*) n from unelemj.reviews r, unnest(r.tags) t
      where r.place = p.slug and not r.hidden group by t) x)
  from unelemj.places p where p.active
$$;

revoke all on function public.ue_ensure_google_place(text, text), public.ue_places() from public;
grant execute on function public.ue_ensure_google_place(text, text), public.ue_places() to anon, authenticated;
