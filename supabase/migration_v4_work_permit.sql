-- FR-125 Work Permit number reservation + persistence
-- Run once in Supabase SQL Editor.

create sequence if not exists public.work_permit_no_seq start 1;

alter table public.access_requests
  add column if not exists work_permit_no text unique,
  add column if not exists work_permit_data jsonb;

create or replace function public.reserve_work_permit_no()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_no bigint;
begin
  v_no := nextval('public.work_permit_no_seq');
  return 'WP-' || to_char(now() at time zone 'Asia/Bangkok','YYYYMMDD') || '-' || lpad(v_no::text,4,'0');
end;
$$;

revoke all on function public.reserve_work_permit_no() from public;
grant execute on function public.reserve_work_permit_no() to anon, authenticated;

-- Patch the existing submission function so the reserved FR-125 number and data are stored.
create or replace function public.submit_access_request(p_request jsonb, p_attendees jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_id uuid := gen_random_uuid();
  v_request_code text;
  v_work_permit_no text;
  v_location text;
  v_visit_date date;
  v_person jsonb;
  v_last4 text;
  v_count integer;
  v_line_no integer := 0;
begin
  if jsonb_typeof(p_request) <> 'object' then raise exception 'Invalid request payload'; end if;
  if jsonb_typeof(p_attendees) <> 'array' then raise exception 'Attendees must be an array'; end if;
  v_count := jsonb_array_length(p_attendees);
  if v_count < 1 or v_count > 100 then raise exception 'Attendee count must be between 1 and 100'; end if;

  v_location := upper(trim(p_request->>'location'));
  if v_location not in ('TT1','TT2','MTG','BNA','RYG') then raise exception 'Invalid location'; end if;
  begin v_visit_date := (p_request->>'visit_date')::date;
  exception when others then raise exception 'Invalid visit date'; end;

  if length(trim(coalesce(p_request->>'project_name',''))) < 1
    or length(trim(coalesce(p_request->>'objective',''))) < 1
    or length(trim(coalesce(p_request->>'room',''))) < 1
    or length(trim(coalesce(p_request->>'source_file_name',''))) < 1
  then raise exception 'Project, objective, room and source file name are required'; end if;

  v_work_permit_no := nullif(trim(coalesce(p_request#>>'{work_permit,workPermitNo}','')),'');
  if v_work_permit_no is null then raise exception 'Please run Work Permit No. before submit'; end if;
  if exists(select 1 from public.access_requests where work_permit_no=v_work_permit_no) then
    raise exception 'Work Permit No. already used';
  end if;

  v_request_code := 'REQ-' || to_char(now() at time zone 'Asia/Bangkok','YYYYMMDD') || '-' || upper(substr(encode(gen_random_bytes(4),'hex'),1,6));

  insert into public.access_requests(
    id,request_code,location,visit_date,project_name,objective,room,host_name,host_phone,notes,source_file_name,
    work_permit_no,work_permit_data
  ) values(
    v_request_id,v_request_code,v_location,v_visit_date,
    left(trim(p_request->>'project_name'),160),left(trim(p_request->>'objective'),240),left(trim(p_request->>'room'),100),
    nullif(left(trim(coalesce(p_request->>'host_name','')),160),''),
    nullif(left(trim(coalesce(p_request->>'host_phone','')),20),''),
    nullif(left(trim(coalesce(p_request->>'notes','')),1000),''),
    left(trim(p_request->>'source_file_name'),255),
    v_work_permit_no,p_request->'work_permit'
  );

  for v_person in select value from jsonb_array_elements(p_attendees) loop
    v_line_no := v_line_no + 1;
    v_last4 := nullif(upper(trim(coalesce(v_person->>'identity_last4',''))),'');
    if v_last4 is not null and v_last4 !~ '^[A-Z0-9]{4}$' then raise exception 'Invalid ID/Passport last 4 characters at row %',v_line_no; end if;
    if upper(trim(v_person->>'attendee_type')) not in ('STAFF','STAFF-EMERGENCY','STAFF-TECHNICIAN','VENDOR','VISITOR') then raise exception 'Invalid attendee type at row %',v_line_no; end if;
    if length(trim(coalesce(v_person->>'company',''))) < 1 or length(trim(coalesce(v_person->>'name',''))) < 1 then raise exception 'Incomplete attendee information at row %',v_line_no; end if;

    insert into public.attendees(request_id,line_no,company,attendee_type,name,mobile,email,card_type,identity_last4,identity_masked,car_license)
    values(v_request_id,v_line_no,left(trim(v_person->>'company'),120),upper(trim(v_person->>'attendee_type')),left(trim(v_person->>'name'),160),
      nullif(left(trim(coalesce(v_person->>'mobile','')),50),''),nullif(lower(left(trim(coalesce(v_person->>'email','')),160)),''),
      nullif(upper(trim(coalesce(v_person->>'card_type',''))),''),v_last4,
      case when v_last4 is null then null else left(trim(coalesce(v_person->>'identity_masked','XXXX'||v_last4)),30) end,
      nullif(left(trim(coalesce(v_person->>'car_license','')),30),''));
  end loop;

  return jsonb_build_object('id',v_request_id,'request_code',v_request_code,'work_permit_no',v_work_permit_no,'status','pending');
end;
$$;

revoke all on function public.submit_access_request(jsonb,jsonb) from public;
grant execute on function public.submit_access_request(jsonb,jsonb) to anon, authenticated;
