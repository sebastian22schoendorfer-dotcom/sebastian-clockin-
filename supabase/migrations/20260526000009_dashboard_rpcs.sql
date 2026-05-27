-- Dashboard + override + auto-close support queries.

create or replace function currently_clocked_in(p_tenant_id uuid)
returns table (
  staff_id uuid,
  full_name text,
  job_role job_role,
  location_id uuid,
  location_name text,
  state text,
  since timestamptz
)
language sql
stable
security invoker
as $func$
  with last_event as (
    select distinct on (ce.staff_id)
      ce.staff_id, ce.type, ce.event_at, ce.location_id
    from clock_events ce
    where ce.tenant_id = p_tenant_id
      and ce.soft_deleted_at is null
    order by ce.staff_id, ce.event_at desc
  )
  select
    s.id,
    s.full_name,
    s.job_role,
    le.location_id,
    l.name,
    case
      when le.type = 'IN' then 'CLOCKED_IN'
      when le.type = 'BREAK_END' then 'CLOCKED_IN'
      when le.type = 'BREAK_START' then 'ON_BREAK'
      else 'CLOCKED_OUT'
    end as state,
    le.event_at
  from staff s
  join last_event le on le.staff_id = s.id
  join locations l on l.id = le.location_id
  where s.tenant_id = p_tenant_id
    and s.soft_deleted_at is null
    and s.status = 'ACTIVE'
    and le.type in ('IN', 'BREAK_END', 'BREAK_START')
  order by le.event_at desc
$func$;

create or replace function todays_hours(p_tenant_id uuid)
returns numeric
language sql
stable
security invoker
as $func$
  with paired as (
    select
      ce.staff_id,
      ce.type,
      ce.event_at,
      lead(ce.event_at) over (partition by ce.staff_id order by ce.event_at) as next_at,
      lead(ce.type) over (partition by ce.staff_id order by ce.event_at) as next_type
    from clock_events ce
    where ce.tenant_id = p_tenant_id
      and ce.soft_deleted_at is null
      and ce.event_at >= date_trunc('day', now() at time zone 'America/Kralendijk') at time zone 'America/Kralendijk'
  )
  select coalesce(sum(extract(epoch from (next_at - event_at))) / 3600, 0)::numeric(8,2)
  from paired
  where type = 'IN' and next_type in ('OUT', 'BREAK_START')
$func$;

create or replace function open_shifts_over_threshold(
  p_tenant_id uuid,
  p_hours integer default 12
)
returns table (
  staff_id uuid,
  full_name text,
  open_in_event_id uuid,
  opened_at timestamptz,
  location_id uuid,
  location_name text
)
language sql
stable
security invoker
as $func$
  with last_event as (
    select distinct on (ce.staff_id)
      ce.staff_id, ce.id, ce.type, ce.event_at, ce.location_id
    from clock_events ce
    where ce.tenant_id = p_tenant_id
      and ce.soft_deleted_at is null
    order by ce.staff_id, ce.event_at desc
  ),
  open_ins as (
    select le.*
    from last_event le
    where le.type in ('IN', 'BREAK_START', 'BREAK_END')
      and now() - le.event_at > make_interval(hours => p_hours)
  )
  select
    s.id,
    s.full_name,
    o.id,
    o.event_at,
    o.location_id,
    l.name
  from open_ins o
  join staff s on s.id = o.staff_id
  join locations l on l.id = o.location_id
  where s.tenant_id = p_tenant_id
    and s.soft_deleted_at is null
$func$;
