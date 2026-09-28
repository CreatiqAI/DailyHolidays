-- Map position for each destination (one pin per area on the explore map).
alter table public.destinations
  add column lat double precision,
  add column lng double precision;

-- seed from the average position of each destination's mapped places
update public.destinations d
set lat = s.lat, lng = s.lng
from (
  select destination_id, avg(lat) as lat, avg(lng) as lng
  from public.places
  where lat is not null and destination_id is not null
  group by destination_id
) s
where s.destination_id = d.id and d.lat is null;
