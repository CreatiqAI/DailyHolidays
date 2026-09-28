-- Admin access: staff log in with Supabase Auth; a row in public.admins grants full edit rights.

-- Importers upsert on (source, source_ref); ON CONFLICT cannot target a partial index.
drop index if exists public.tours_source_ref_key;
alter table public.tours add constraint tours_source_ref_key unique (source, source_ref);

create table public.admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "admins read self" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- full access for admins on every content table
create policy "admin all destinations" on public.destinations
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all tours" on public.tours
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all departures" on public.tour_departures
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all days" on public.tour_days
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all places" on public.places
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all day places" on public.tour_day_places
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all media" on public.tour_media
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin read enquiries" on public.enquiries
  for select to authenticated using ((select public.is_admin()));
create policy "admin update enquiries" on public.enquiries
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete enquiries" on public.enquiries
  for delete to authenticated using ((select public.is_admin()));

-- storage: admins manage files in the tour-media bucket (bucket itself is public-read)
create policy "admin insert tour-media" on storage.objects
  for insert to authenticated with check (bucket_id = 'tour-media' and (select public.is_admin()));
create policy "admin update tour-media" on storage.objects
  for update to authenticated using (bucket_id = 'tour-media' and (select public.is_admin()));
create policy "admin delete tour-media" on storage.objects
  for delete to authenticated using (bucket_id = 'tour-media' and (select public.is_admin()));
