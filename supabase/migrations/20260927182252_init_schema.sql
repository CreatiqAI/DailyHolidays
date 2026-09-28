-- Daily Holidays: initial schema
-- Tours -> departures (date + price), days (itinerary), media (images/PDFs)
-- Places are pinned to itinerary days for the route map.
-- Public can read published content and submit enquiries; all writes go through the service role (admin).

-- ---------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- destinations (country / area, e.g. "Hainan" under "China")
-- ---------------------------------------------------------------------
create table public.destinations (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  region      text,                                   -- Asia, Europe, Middle East ...
  parent_id   uuid references public.destinations(id) on delete set null,
  cover_image_url text,
  created_at  timestamptz not null default now()
);
create index on public.destinations (parent_id);

-- ---------------------------------------------------------------------
-- tours
-- ---------------------------------------------------------------------
create type public.tour_status as enum ('draft', 'published', 'archived');
create type public.tour_type as enum ('group', 'ground', 'cruise', 'malaysia', 'other');

create table public.tours (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  code             text,                              -- operator code, e.g. 5DCY3
  title            text not null,
  tour_type        public.tour_type not null default 'group',
  destination_id   uuid references public.destinations(id) on delete set null,
  duration_days    smallint,
  duration_nights  smallint,
  summary          text,
  description      text,                              -- markdown
  highlights       text[] not null default '{}',
  inclusions       text[] not null default '{}',
  exclusions       text[] not null default '{}',
  airline          text,
  hotel_rating     text,                              -- "Local 4*"
  price_from_myr   numeric(10,2),                     -- denormalised min price for listing/sorting
  cover_image_url  text,
  status           public.tour_status not null default 'draft',
  source           text,                              -- legacy_site | drive | manual
  source_ref       text,                              -- old product id / drive file id
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.tours (destination_id);
create index on public.tours (status);
create unique index tours_source_ref_key on public.tours (source, source_ref) where source_ref is not null;
create trigger tours_set_updated_at before update on public.tours
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- departures (one row per date; price per person in MYR)
-- ---------------------------------------------------------------------
create type public.departure_status as enum ('available', 'limited', 'full', 'cancelled');

create table public.tour_departures (
  id              uuid primary key default gen_random_uuid(),
  tour_id         uuid not null references public.tours(id) on delete cascade,
  departure_date  date not null,
  price_myr       numeric(10,2),
  price_note      text,                               -- "Buy 1 Free 1", "per couple"
  status          public.departure_status not null default 'available',
  created_at      timestamptz not null default now(),
  unique (tour_id, departure_date, price_note)
);
create index on public.tour_departures (tour_id);
create index on public.tour_departures (departure_date);

-- ---------------------------------------------------------------------
-- itinerary days
-- ---------------------------------------------------------------------
create table public.tour_days (
  id          uuid primary key default gen_random_uuid(),
  tour_id     uuid not null references public.tours(id) on delete cascade,
  day_number  smallint not null,
  title       text not null,
  description text,
  meals       text[] not null default '{}',            -- B / L / D
  hotel       text,
  unique (tour_id, day_number)
);
create index on public.tour_days (tour_id);

-- ---------------------------------------------------------------------
-- places (map pins) + which day visits them
-- ---------------------------------------------------------------------
create table public.places (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  destination_id  uuid references public.destinations(id) on delete set null,
  lat             double precision,
  lng             double precision,
  description     text,
  image_url       text,
  created_at      timestamptz not null default now()
);
create index on public.places (destination_id);

create table public.tour_day_places (
  tour_day_id  uuid not null references public.tour_days(id) on delete cascade,
  place_id     uuid not null references public.places(id) on delete cascade,
  sort_order   smallint not null default 0,
  primary key (tour_day_id, place_id)
);
create index on public.tour_day_places (place_id);

-- ---------------------------------------------------------------------
-- media (gallery images + downloadable itinerary PDFs)
-- ---------------------------------------------------------------------
create type public.media_kind as enum ('image', 'pdf');

create table public.tour_media (
  id          uuid primary key default gen_random_uuid(),
  tour_id     uuid not null references public.tours(id) on delete cascade,
  kind        public.media_kind not null,
  url         text not null,
  caption     text,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);
create index on public.tour_media (tour_id);

-- ---------------------------------------------------------------------
-- enquiries (public form -> staff)
-- ---------------------------------------------------------------------
create table public.enquiries (
  id               uuid primary key default gen_random_uuid(),
  tour_id          uuid references public.tours(id) on delete set null,
  departure_id     uuid references public.tour_departures(id) on delete set null,
  name             text not null check (char_length(name) between 1 and 200),
  phone            text not null check (char_length(phone) between 6 and 30),
  email            text check (email is null or char_length(email) <= 200),
  pax              smallint check (pax is null or pax between 1 and 99),
  message          text check (message is null or char_length(message) <= 2000),
  handled          boolean not null default false,
  created_at       timestamptz not null default now()
);
create index on public.enquiries (tour_id);
create index on public.enquiries (departure_id);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.destinations     enable row level security;
alter table public.tours            enable row level security;
alter table public.tour_departures  enable row level security;
alter table public.tour_days        enable row level security;
alter table public.places           enable row level security;
alter table public.tour_day_places  enable row level security;
alter table public.tour_media       enable row level security;
alter table public.enquiries        enable row level security;

create policy "public read destinations" on public.destinations
  for select to anon, authenticated using (true);

create policy "public read places" on public.places
  for select to anon, authenticated using (true);

create policy "public read published tours" on public.tours
  for select to anon, authenticated using (status = 'published');

create policy "public read departures of published tours" on public.tour_departures
  for select to anon, authenticated
  using (exists (select 1 from public.tours t where t.id = tour_id and t.status = 'published'));

create policy "public read days of published tours" on public.tour_days
  for select to anon, authenticated
  using (exists (select 1 from public.tours t where t.id = tour_id and t.status = 'published'));

create policy "public read day places of published tours" on public.tour_day_places
  for select to anon, authenticated
  using (exists (
    select 1 from public.tour_days d join public.tours t on t.id = d.tour_id
    where d.id = tour_day_id and t.status = 'published'));

create policy "public read media of published tours" on public.tour_media
  for select to anon, authenticated
  using (exists (select 1 from public.tours t where t.id = tour_id and t.status = 'published'));

-- enquiries: anyone may submit, nobody but the service role may read
create policy "public submit enquiry" on public.enquiries
  for insert to anon, authenticated with check (handled = false);

-- ---------------------------------------------------------------------
-- storage bucket for images + PDFs (public read, service-role write)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('tour-media', 'tour-media', true)
on conflict (id) do nothing;
