-- Update an existing project to the simplified security time model.

alter table public.attendees
  add column if not exists entry_time time,
  add column if not exists exit_time time,
  add column if not exists card_exchange_time time,
  add column if not exists card_return_time time;

-- Old Zone columns may be removed only after confirming no historical data is needed.
-- alter table public.attendees drop column if exists zone1_in;
-- alter table public.attendees drop column if exists zone1_out;
-- alter table public.attendees drop column if exists zone2_in;
-- alter table public.attendees drop column if exists zone2_out;
