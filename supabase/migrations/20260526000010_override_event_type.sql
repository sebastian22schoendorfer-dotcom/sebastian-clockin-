alter table override_requests
  add column if not exists requested_event_type clock_event_type not null default 'IN';

update override_requests set requested_event_type = 'IN'
  where requested_event_type is null;
