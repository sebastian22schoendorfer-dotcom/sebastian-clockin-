-- Row-Level Security. Decision #14.

alter table tenants                enable row level security;
alter table app_users              enable row level security;
alter table enrollment_tokens      enable row level security;
alter table locations              enable row level security;
alter table staff                  enable row level security;
alter table staff_locations        enable row level security;
alter table contracts              enable row level security;
alter table rate_overrides         enable row level security;
alter table holidays               enable row level security;
alter table override_requests      enable row level security;
alter table clock_events           enable row level security;
alter table pending_close_requests enable row level security;
alter table login_events           enable row level security;
alter table audit_log              enable row level security;

do $rls$
declare
  t text;
  tbls text[] := array[
    'app_users', 'locations', 'staff', 'staff_locations', 'contracts',
    'rate_overrides', 'holidays', 'override_requests', 'clock_events',
    'audit_log', 'login_events', 'enrollment_tokens'
  ];
begin
  foreach t in array tbls loop
    execute format($f$
      create policy "%1$s_tenant_select" on %1$s
      for select to authenticated
      using (
        tenant_id = public.current_tenant_id()
        and (soft_deleted_at is null or current_setting('app.show_deleted', true) = 'true')
      );
    $f$, t);
    execute format($f$
      create policy "%1$s_tenant_insert" on %1$s
      for insert to authenticated
      with check (tenant_id = public.current_tenant_id());
    $f$, t);
    execute format($f$
      create policy "%1$s_tenant_update" on %1$s
      for update to authenticated
      using (tenant_id = public.current_tenant_id())
      with check (tenant_id = public.current_tenant_id());
    $f$, t);
  end loop;
end$rls$;

create policy "pending_close_requests_tenant_select" on pending_close_requests
  for select to authenticated using (tenant_id = public.current_tenant_id());
create policy "pending_close_requests_tenant_insert" on pending_close_requests
  for insert to authenticated with check (tenant_id = public.current_tenant_id());
create policy "pending_close_requests_tenant_update" on pending_close_requests
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "tenants_self_select" on tenants
  for select to authenticated using (id = public.current_tenant_id());

insert into storage.buckets (id, name, public) values
  ('contracts', 'contracts', false),
  ('uploads', 'uploads', false)
on conflict (id) do nothing;

create policy "storage_contracts_tenant_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );
create policy "storage_contracts_tenant_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );
create policy "storage_uploads_tenant_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );
create policy "storage_uploads_tenant_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );
