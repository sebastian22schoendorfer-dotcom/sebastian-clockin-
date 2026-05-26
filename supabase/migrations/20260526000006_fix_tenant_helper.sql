-- tenant_id and role live inside app_metadata; the M1 helper assumed top-level.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $func$
  select nullif(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'tenant_id',
      auth.jwt() ->> 'tenant_id'
    ),
    ''
  )::uuid
$func$;

create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $func$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'role'
  )
$func$;
