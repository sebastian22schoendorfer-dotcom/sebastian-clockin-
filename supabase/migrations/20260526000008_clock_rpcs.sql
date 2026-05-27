-- Clock-loop server logic. All authoritative checks (accuracy gate, perimeter
-- check, current state) run through these RPCs so the JS side never gets to
-- lie about distance or assignment.

create or replace function current_clock_state(
  p_tenant_id uuid,
  p_staff_id uuid
)
returns table (
  state text,
  last_event_id uuid,
  last_event_type clock_event_type,
  last_event_at timestamptz,
  last_location_id uuid,
  last_location_name text
)
language sql
stable
security invoker
as $func$
  with last_event as (
    select ce.*, l.name as location_name
    from clock_events ce
    join locations l on l.id = ce.location_id
    where ce.tenant_id = p_tenant_id
      and ce.staff_id = p_staff_id
      and ce.soft_deleted_at is null
    order by ce.event_at desc
    limit 1
  )
  select
    case
      when le.id is null then 'CLOCKED_OUT'
      when le.type = 'IN' then 'CLOCKED_IN'
      when le.type = 'BREAK_END' then 'CLOCKED_IN'
      when le.type = 'BREAK_START' then 'ON_BREAK'
      when le.type = 'OUT' then 'CLOCKED_OUT'
      else 'CLOCKED_OUT'
    end as state,
    le.id, le.type, le.event_at, le.location_id, le.location_name
  from (select null::uuid as id, null::clock_event_type as type,
               null::timestamptz as event_at, null::uuid as location_id,
               null::text as location_name) z
  left join last_event le on true
$func$;

create or replace function check_clock_perimeter(
  p_tenant_id uuid,
  p_staff_id uuid,
  p_location_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy_m numeric
)
returns table (
  verdict text,
  distance_m numeric,
  radius_m integer
)
language plpgsql
stable
security invoker
as $func$
declare
  v_point geography;
  v_radius integer;
  v_dist double precision;
begin
  if p_accuracy_m > 50 then
    verdict := 'LOW_ACCURACY';
    distance_m := null;
    radius_m := null;
    return next;
    return;
  end if;

  select l.point, l.radius_m
    into v_point, v_radius
  from locations l
  join staff_locations sl on sl.location_id = l.id
  where l.id = p_location_id
    and l.tenant_id = p_tenant_id
    and sl.staff_id = p_staff_id
    and l.soft_deleted_at is null;

  if v_point is null then
    verdict := 'NOT_ASSIGNED';
    distance_m := null;
    radius_m := null;
    return next;
    return;
  end if;

  v_dist := ST_Distance(
    v_point,
    ST_GeographyFromText('SRID=4326;POINT(' || p_lng || ' ' || p_lat || ')')
  );

  verdict := case when v_dist <= v_radius then 'OK' else 'OUT_OF_ZONE' end;
  distance_m := v_dist::numeric;
  radius_m := v_radius;
  return next;
end;
$func$;

create or replace function staff_assigned_locations(
  p_tenant_id uuid,
  p_staff_id uuid
)
returns table (
  id uuid,
  name text,
  is_primary boolean,
  lat double precision,
  lng double precision,
  radius_m integer
)
language sql
stable
security invoker
as $func$
  select
    l.id,
    l.name,
    sl.is_primary,
    ST_Y(l.point::geometry) as lat,
    ST_X(l.point::geometry) as lng,
    l.radius_m
  from staff_locations sl
  join locations l on l.id = sl.location_id
  where sl.staff_id = p_staff_id
    and sl.tenant_id = p_tenant_id
    and l.soft_deleted_at is null
  order by sl.is_primary desc, l.name
$func$;

create or replace function recent_clock_events(
  p_tenant_id uuid,
  p_staff_id uuid,
  p_limit integer default 10
)
returns table (
  id uuid,
  type clock_event_type,
  event_at timestamptz,
  location_id uuid,
  location_name text,
  flags text[]
)
language sql
stable
security invoker
as $func$
  select ce.id, ce.type, ce.event_at, ce.location_id, l.name, ce.flags
  from clock_events ce
  join locations l on l.id = ce.location_id
  where ce.tenant_id = p_tenant_id
    and ce.staff_id = p_staff_id
    and ce.soft_deleted_at is null
  order by ce.event_at desc
  limit p_limit
$func$;
