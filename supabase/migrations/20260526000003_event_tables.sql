-- Event-stream tables. 5-year retention enforced in 20260526000005_retention_triggers.

create table override_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete restrict,
  requested_location_id uuid not null references locations(id) on delete restrict,
  lat double precision not null,
  lng double precision not null,
  accuracy_m numeric(6,1) not null,
  distance_m numeric(8,1) not null,
  reason text,
  status override_status not null default 'PENDING',
  approved_by_user_id uuid references app_users(id),
  approved_at timestamptz,
  approval_clock_event_id uuid,
  rejection_reason text,
  created_at timestamptz not null default now(),
  soft_deleted_at timestamptz
);
create index override_requests_tenant_idx on override_requests (tenant_id);
create index override_requests_pending_idx on override_requests (tenant_id, status) where status = 'PENDING';

create table clock_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete restrict,
  location_id uuid not null references locations(id) on delete restrict,
  type clock_event_type not null,
  event_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  accuracy_m numeric(6,1),
  distance_m numeric(8,1),
  flags text[] not null default '{}'::text[],
  override_request_id uuid references override_requests(id),
  created_at timestamptz not null default now(),
  soft_deleted_at timestamptz
);
create index clock_events_tenant_idx on clock_events (tenant_id);
create index clock_events_staff_at_idx on clock_events (staff_id, event_at desc) where soft_deleted_at is null;
create index clock_events_location_at_idx on clock_events (location_id, event_at desc) where soft_deleted_at is null;
create index clock_events_period_idx on clock_events (tenant_id, event_at) where soft_deleted_at is null;

alter table override_requests
  add constraint override_requests_approval_clock_event_fk
  foreign key (approval_clock_event_id) references clock_events(id);

create table pending_close_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete restrict,
  opened_clock_event_id uuid not null references clock_events(id),
  opened_at timestamptz not null,
  suggested_close_at timestamptz not null,
  status close_request_status not null default 'PENDING',
  closed_at timestamptz,
  closed_by_user_id uuid references app_users(id),
  resolution_clock_event_id uuid references clock_events(id),
  created_at timestamptz not null default now()
);
create index pending_close_requests_tenant_idx on pending_close_requests (tenant_id);
create index pending_close_requests_pending_idx on pending_close_requests (tenant_id, status) where status = 'PENDING';

create table login_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  app_user_id uuid references app_users(id) on delete set null,
  event_type login_event_type not null,
  at timestamptz not null default now(),
  ip inet,
  user_agent text,
  soft_deleted_at timestamptz,
  check ((staff_id is null) <> (app_user_id is null))
);
create index login_events_tenant_idx on login_events (tenant_id);
create index login_events_staff_idx on login_events (staff_id, at desc);
create index login_events_user_idx on login_events (app_user_id, at desc);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_user_id uuid references app_users(id) on delete set null,
  actor_staff_id uuid references staff(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid,
  before jsonb,
  after jsonb,
  at timestamptz not null default now(),
  soft_deleted_at timestamptz
);
create index audit_log_tenant_at_idx on audit_log (tenant_id, at desc);
create index audit_log_target_idx on audit_log (target_table, target_id);
