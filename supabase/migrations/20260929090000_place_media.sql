-- Real photos + short descriptions for itinerary stops, found on Wikipedia/Wikimedia Commons.
-- media_status: null = not searched yet
--   found    = matched and verified (article within a few km of the stop) -> shown publicly
--   review   = matched but not verified -> hidden until staff approve
--   approved = staff approved a match      -> shown
--   manual   = staff uploaded their own    -> shown
--   none     = searched, nothing suitable found
--   rejected = staff rejected the match
alter table public.places
  add column media_status text check (media_status in ('found', 'review', 'approved', 'manual', 'none', 'rejected')),
  add column image_credit text,        -- "Photo: <author> / <license>"
  add column image_source_url text,    -- file page on Wikimedia Commons
  add column info_source_url text,     -- Wikipedia article the description is based on
  add column enriched_at timestamptz;

create index places_media_status_idx on public.places (media_status);
