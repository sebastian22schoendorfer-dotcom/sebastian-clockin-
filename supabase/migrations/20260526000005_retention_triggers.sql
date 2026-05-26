-- Decision #12: hard delete blocked on retention-locked tables until 5 years
-- past soft_deleted_at.

create or replace function block_premature_hard_delete()
returns trigger
language plpgsql
as $func$
declare
  retention interval := interval '5 years';
begin
  if old.soft_deleted_at is not null
     and old.soft_deleted_at < (now() - retention) then
    return old;
  end if;

  raise exception
    'Hard delete from % blocked by retention policy. Row must be soft-deleted (soft_deleted_at IS NOT NULL) at least 5 years before purge. See docs/decisions.md decision #12.',
    tg_table_name
    using errcode = '42501';
end$func$;

create trigger clock_events_block_hard_delete
  before delete on clock_events
  for each row execute function block_premature_hard_delete();
create trigger contracts_block_hard_delete
  before delete on contracts
  for each row execute function block_premature_hard_delete();
create trigger audit_log_block_hard_delete
  before delete on audit_log
  for each row execute function block_premature_hard_delete();
create trigger login_events_block_hard_delete
  before delete on login_events
  for each row execute function block_premature_hard_delete();
