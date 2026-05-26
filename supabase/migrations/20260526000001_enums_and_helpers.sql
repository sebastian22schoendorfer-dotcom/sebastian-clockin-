-- Enums + helper functions used across the schema.
-- Decisions referenced inline link to docs/decisions.md.

create type job_role as enum ('KITCHEN', 'SERVICE');
create type contract_type as enum ('FULL_TIME', 'PART_TIME', 'CASUAL');
create type staff_status as enum ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
create type admin_role as enum ('OWNER', 'SUPERVISOR');
create type clock_event_type as enum ('IN', 'OUT', 'BREAK_START', 'BREAK_END');
create type override_status as enum ('PENDING', 'APPROVED', 'REJECTED');
create type close_request_status as enum ('PENDING', 'CLOSED', 'EXPIRED');
create type login_event_type as enum ('LOGIN_OK', 'LOGIN_FAIL', 'LOGIN_LOCKOUT');
create type ot_basis as enum ('weekly', 'daily', 'both');

-- Reads tenant_id from the authenticated JWT. Decision #14.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $func$
  select nullif(auth.jwt() ->> 'tenant_id', '')::uuid
$func$;

create or replace function public.current_jwt_role()
returns text
language sql
stable
as $func$
  select coalesce(auth.jwt() ->> 'role', 'anon')
$func$;
