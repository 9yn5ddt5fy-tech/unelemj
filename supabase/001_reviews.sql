-- ============================================================================
-- Үнэлэмж · reviews server (Supabase / PostgreSQL 15+)
--
-- Everything lives in the private schema "unelemj". The browser only calls the
-- public.ue_* functions with the project's publishable (anon) key; tables are
-- never exposed directly.
--
--   * anyone can leave a review without an account
--   * limits: one review per device per place per day, and at most 5 reviews
--     per network address per place per day (stops one person flooding a page)
--   * each place has its own owner key: the owner can reply to reviews and hide
--     abusive ones, but cannot edit or delete what a guest wrote
--   * hidden reviews still count for nothing and are kept for the record
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;
create schema if not exists unelemj;
revoke all on schema unelemj from public;

-- ---------------------------------------------------------------- tables
create table if not exists unelemj.places (
  slug        text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name        text not null,
  category    text not null,
  location    text not null default '',
  owner_hash  text,                       -- bcrypt of the owner key
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists unelemj.reviews (
  id          bigint generated always as identity primary key,
  place       text not null references unelemj.places(slug),
  rating      smallint not null check (rating between 1 and 5),
  service     smallint check (service between 1 and 5),
  clean       smallint check (clean between 1 and 5),
  value       smallint check (value between 1 and 5),
  tags        text[] not null default '{}',
  body        text not null default '' check (char_length(body) <= 1000),
  author      text not null default '' check (char_length(author) <= 40),
  device      text not null check (char_length(device) between 8 and 64),
  ip_hash     text not null default '',
  hidden      boolean not null default false,
  reply       text check (char_length(reply) <= 1000),
  reply_at    timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists reviews_place_time on unelemj.reviews (place, created_at desc);

alter table unelemj.places  enable row level security;
alter table unelemj.reviews enable row level security;
revoke all on unelemj.places, unelemj.reviews from public, anon, authenticated;

-- The tags a guest may pick (kept short so the summary stays readable)
create or replace function unelemj.allowed_tags() returns text[] language sql immutable as $$
  select array['Найрсаг ажилтан','Цэвэрхэн','Амттай хоол','Үзэмж сайхан','Тухтай','Үнэ боломжийн',
               'Хүүхдэд тохиромжтой','Чимээгүй','Удаан хүлээлгэдэг','Үнэтэй','Цэвэрлэгээ дутуу','Ус, цахилгаан тасалдсан']
$$;

-- ---------------------------------------------------------------- helpers
create or replace function unelemj.client_ip_hash() returns text language plpgsql stable as $$
declare h json; ip text;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then h := null; end;
  ip := split_part(coalesce(h->>'x-forwarded-for', h->>'x-real-ip', ''), ',', 1);
  return encode(extensions.digest('unelemj:' || trim(ip), 'sha256'), 'hex');
end $$;

create or replace function unelemj.check_owner(p_place text, k text) returns void language plpgsql as $$
declare h text := (select owner_hash from unelemj.places where slug = p_place);
begin
  if h is null or h <> extensions.crypt(coalesce(k, ''), h) then raise exception 'owner'; end if;
end $$;

-- Run from the SQL editor to add a place or change its owner key:
--   select unelemj.add_place('usukh-ugii', 'Usukh Ugii', 'Амралтын газар', 'Өгий нуур', 'урт-нууц-түлхүүр');
create or replace function unelemj.add_place(p_slug text, p_name text, p_cat text, p_loc text, p_key text)
returns void language sql as $$
  insert into unelemj.places (slug, name, category, location, owner_hash)
  values (p_slug, p_name, p_cat, p_loc, extensions.crypt(p_key, extensions.gen_salt('bf')))
  on conflict (slug) do update set name = excluded.name, category = excluded.category,
    location = excluded.location, owner_hash = excluded.owner_hash
$$;

-- ---------------------------------------------------------------- public API
-- Place header + summary
create or replace function public.ue_place(p_place text) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'slug', p.slug, 'name', p.name, 'category', p.category, 'location', p.location,
    'count',   (select count(*) from unelemj.reviews r where r.place = p.slug and not r.hidden),
    'avg',     (select round(avg(rating)::numeric, 2) from unelemj.reviews r where r.place = p.slug and not r.hidden),
    'service', (select round(avg(service)::numeric, 2) from unelemj.reviews r where r.place = p.slug and not r.hidden),
    'clean',   (select round(avg(clean)::numeric, 2) from unelemj.reviews r where r.place = p.slug and not r.hidden),
    'value',   (select round(avg(value)::numeric, 2) from unelemj.reviews r where r.place = p.slug and not r.hidden),
    'dist',    (select json_object_agg(s, (select count(*) from unelemj.reviews r where r.place = p.slug and not r.hidden and r.rating = s))
                from generate_series(1, 5) s),
    'tags',    (select coalesce(json_object_agg(t, n), '{}'::json) from (
                  select t, count(*) n from unelemj.reviews r, unnest(r.tags) t
                  where r.place = p.slug and not r.hidden group by t order by n desc) x),
    'allowed_tags', unelemj.allowed_tags())
  from unelemj.places p where p.slug = p_place and p.active
$$;

-- Newest visible reviews, paged by id
create or replace function public.ue_reviews(p_place text, p_before bigint default null, p_limit int default 20)
returns table (id bigint, rating smallint, service smallint, clean smallint, value smallint, tags text[],
               body text, author text, reply text, reply_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.rating, r.service, r.clean, r.value, r.tags, r.body, r.author, r.reply, r.reply_at, r.created_at
  from unelemj.reviews r
  where r.place = p_place and not r.hidden and (p_before is null or r.id < p_before)
  order by r.id desc limit least(greatest(p_limit, 1), 50)
$$;

-- Leave a review
create or replace function public.ue_submit(p_place text, p_device text, p_rating int,
  p_service int default null, p_clean int default null, p_value int default null,
  p_tags text[] default '{}', p_body text default '', p_author text default '')
returns json language plpgsql security definer set search_path = '' as $$
declare ip text := unelemj.client_ip_hash(); new_id bigint;
begin
  if not exists (select 1 from unelemj.places where slug = p_place and active) then raise exception 'place'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'rating'; end if;
  if char_length(coalesce(p_device, '')) not between 8 and 64 then raise exception 'device'; end if;
  if exists (select 1 from unelemj.reviews where place = p_place and device = p_device
             and created_at > now() - interval '24 hours') then raise exception 'too_soon'; end if;
  if (select count(*) from unelemj.reviews where place = p_place and ip_hash = ip
      and created_at > now() - interval '24 hours') >= 5 then raise exception 'too_many'; end if;
  insert into unelemj.reviews (place, rating, service, clean, value, tags, body, author, device, ip_hash)
  values (p_place, p_rating,
          case when p_service between 1 and 5 then p_service end,
          case when p_clean   between 1 and 5 then p_clean end,
          case when p_value   between 1 and 5 then p_value end,
          coalesce((select array_agg(t) from unnest(p_tags) t where t = any(unelemj.allowed_tags())), '{}'),
          left(trim(coalesce(p_body, '')), 1000), left(trim(coalesce(p_author, '')), 40), p_device, ip)
  returning id into new_id;
  return json_build_object('id', new_id);
end $$;

-- Owner: list everything (hidden too), reply, hide/unhide
create or replace function public.ue_owner_reviews(p_place text, p_key text)
returns table (id bigint, rating smallint, tags text[], body text, author text, hidden boolean,
               reply text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform unelemj.check_owner(p_place, p_key);
  return query select r.id, r.rating, r.tags, r.body, r.author, r.hidden, r.reply, r.created_at
    from unelemj.reviews r where r.place = p_place order by r.id desc limit 500;
end $$;

create or replace function public.ue_owner_reply(p_place text, p_key text, p_id bigint, p_reply text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform unelemj.check_owner(p_place, p_key);
  update unelemj.reviews set reply = nullif(left(trim(coalesce(p_reply, '')), 1000), ''),
    reply_at = case when nullif(trim(coalesce(p_reply, '')), '') is null then null else now() end
  where id = p_id and place = p_place;
end $$;

create or replace function public.ue_owner_hide(p_place text, p_key text, p_id bigint, p_hidden boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform unelemj.check_owner(p_place, p_key);
  update unelemj.reviews set hidden = p_hidden where id = p_id and place = p_place;
end $$;

revoke all on function public.ue_place(text), public.ue_reviews(text, bigint, int),
  public.ue_submit(text, text, int, int, int, int, text[], text, text),
  public.ue_owner_reviews(text, text), public.ue_owner_reply(text, text, bigint, text),
  public.ue_owner_hide(text, text, bigint, boolean) from public;
grant execute on function public.ue_place(text), public.ue_reviews(text, bigint, int),
  public.ue_submit(text, text, int, int, int, int, text[], text, text),
  public.ue_owner_reviews(text, text), public.ue_owner_reply(text, text, bigint, text),
  public.ue_owner_hide(text, text, bigint, boolean) to anon, authenticated;
