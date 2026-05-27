create or replace function admin_list_locations(p_tenant_id uuid)
returns table (
  id uuid,
  name text,
  address text,
  lat double precision,
  lng double precision,
  radius_m integer,
  business_day_starts_at time,
  timezone text,
  staff_count integer
)
language sql
stable
security invoker
as $func$
  select
    l.id,
    l.name,
    l.address,
    ST_Y(l.point::geometry) as lat,
    ST_X(l.point::geometry) as lng,
    l.radius_m,
    l.business_day_starts_at,
    l.timezone,
    coalesce((
      select count(*)::integer
      from staff_locations sl
      join staff s on s.id = sl.staff_id
      where sl.location_id = l.id and s.soft_deleted_at is null
    ), 0) as staff_count
  from locations l
  where l.tenant_id = p_tenant_id
    and l.soft_deleted_at is null
  order by l.name
$func$;

create or replace function admin_get_location(p_tenant_id uuid, p_id uuid)
returns table (
  id uuid,
  name text,
  address text,
  lat double precision,
  lng double precision,
  radius_m integer,
  business_day_starts_at time,
  timezone text
)
language sql
stable
security invoker
as $func$
  select
    l.id,
    l.name,
    l.address,
    ST_Y(l.point::geometry) as lat,
    ST_X(l.point::geometry) as lng,
    l.radius_m,
    l.business_day_starts_at,
    l.timezone
  from locations l
  where l.tenant_id = p_tenant_id
    and l.id = p_id
    and l.soft_deleted_at is null
$func$;
