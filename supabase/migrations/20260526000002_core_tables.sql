-- Core entities: tenant, locations, staff, contracts, holidays.
-- Every table carries tenant_id for multi-tenant RLS (Decision #14).
-- Every table carries soft_deleted_at for the two-tier delete model (Decision #12).

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  soft_deleted_at timestamptz
);

create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete restrict,
  email citext not null,
  full_name text not null,
  role admin_role not null,
  totp_enrolled_at timestamptz,
  status staff_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  soft_deleted_at timestamptz,
  unique (tenant_id, email)
);
create index app_users_tenant_idx on app_users (tenant_id);

create table enrollment_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  app_user_id uuid not null references app_users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index enrollment_tokens_tenant_idx on enrollment_tokens (tenant_id);
create index enrollment_tokens_user_idx on enrollment_tokens (app_user_id);

create table locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  address text,
  point geography(point, 4326) not null,
  radius_m integer not null check (radius_m between 25 and 1000),
  business_day_starts_at time not null default '04:00',
  timezone text not null default 'America/Kralendijk',
  created_at timestamptz not null default now(),
  soft_deleted_at timestamptz
);
create index locations_tenant_idx on locations (tenant_id);
create index locations_point_idx on locations using gist (point);

create table staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email citext not null,
  pin_hash text not null,
  full_name text not null,
  job_role job_role not null,
  contract_type contract_type not null,
  date_of_birth date not null,
  status staff_status not null default 'ACTIVE',
  failed_pin_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  soft_deleted_at timestamptz,
  unique (tenant_id, email)
);
create index staff_tenant_idx on staff (tenant_id);
create index staff_status_idx on staff (tenant_id, status) where soft_deleted_at is null;

create or replace function staff_is_minor(dob date)
returns boolean
language sql
immutable
as $func$
  select age(dob) < interval '17 years'
$func$;

create table staff_locations (
  staff_id uuid not null references staff(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (staff_id, location_id)
);
create index staff_locations_tenant_idx on staff_locations (tenant_id);
create index staff_locations_location_idx on staff_locations (location_id);
create unique index staff_locations_one_primary on staff_locations (staff_id) where is_primary;

create table contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete restrict,
  location_id uuid not null references locations(id) on delete restrict,
  rate_regular_usd numeric(6,2) not null check (rate_regular_usd > 0),
  ot_policy jsonb not null default '{
    "basis": "weekly",
    "weekly_threshold_h": 40,
    "daily_threshold_h": 9,
    "multiplier": 1.5,
    "holiday_multiplier": 1.5
  }'::jsonb,
  effective_from date not null,
  effective_to date,
  pdf_storage_path text,
  signed_at timestamptz,
  signature_image_path text,
  created_at timestamptz not null default now(),
  soft_deleted_at timestamptz,
  check (effective_to is null or effective_to >= effective_from)
);
create index contracts_tenant_idx on contracts (tenant_id);
create index contracts_staff_idx on contracts (staff_id);
create index contracts_effective_idx on contracts (staff_id, effective_from, effective_to);

create table rate_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  rate_usd numeric(6,2) not null check (rate_usd > 0),
  effective_from date not null,
  effective_to date not null,
  reason text not null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references app_users(id),
  soft_deleted_at timestamptz,
  check (effective_to >= effective_from)
);
create index rate_overrides_tenant_idx on rate_overrides (tenant_id);
create index rate_overrides_staff_idx on rate_overrides (staff_id);

create table holidays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  date date not null,
  name text not null,
  created_at timestamptz not null default now(),
  soft_deleted_at timestamptz,
  unique (tenant_id, date)
);
create index holidays_tenant_idx on holidays (tenant_id);
