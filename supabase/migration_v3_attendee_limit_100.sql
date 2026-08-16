-- Increase the maximum attendees per access request from 25 to 100.
-- Run this migration in the existing Supabase project.

alter table public.attendees
  drop constraint if exists attendees_line_no_check;

alter table public.attendees
  add constraint attendees_line_no_check
  check (line_no between 1 and 100);

-- Preserve the current submit_access_request implementation and only
-- update the attendee-count validation in-place.
do $$
declare
  v_function_definition text;
begin
  select pg_get_functiondef(
    'public.submit_access_request(jsonb,jsonb)'::regprocedure
  )
  into v_function_definition;

  if position('v_count > 25' in v_function_definition) = 0 then
    raise exception 'Could not find the existing 25-attendee validation in submit_access_request';
  end if;

  v_function_definition := replace(
    v_function_definition,
    'v_count > 25',
    'v_count > 100'
  );

  v_function_definition := replace(
    v_function_definition,
    'between 1 and 25',
    'between 1 and 100'
  );

  execute v_function_definition;
end
$$;
