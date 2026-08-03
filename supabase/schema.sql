-- Data Center Access Registration v2
-- StaffTemplate upload -> FR-037
-- Run this entire file in a NEW Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text unique not null,
  location text not null check (location in ('TT1','TT2','MTG','BNA','RYG')),
  visit_date date not null,
  project_name text not null,
  objective text not null,
  room text not null,
  host_name text,
  host_phone text,
  notes text,
  source_file_name text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','completed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.access_requests(id) on delete cascade,
  line_no smallint not null check (line_no between 1 and 25),
  company text not null,
  attendee_type text not null check (attendee_type in ('STAFF','STAFF-EMERGENCY','STAFF-TECHNICIAN','VENDOR','VISITOR')),
  name text not null,
  mobile text,
  email text,
  card_type text not null check (card_type in ('ID','PASSPORT')),
  identity_last4 text not null check (identity_last4 ~ '^[A-Za-z0-9]{4}$'),
  identity_masked text not null,
  car_license text,
  tidc_card_no text,
  entry_time time,
  exit_time time,
  card_exchange_time time,
  card_return_time time,
  created_at timestamptz not null default now(),
  unique (request_id, line_no)
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create index if not exists access_requests_visit_date_idx on public.access_requests(visit_date);
create index if not exists access_requests_status_idx on public.access_requests(status);
create index if not exists attendees_request_id_idx on public.attendees(request_id);

alter table public.access_requests enable row level security;
alter table public.attendees enable row level security;
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Only authenticated administrators can read/update operational data.
drop policy if exists "admins_select_requests" on public.access_requests;
create policy "admins_select_requests" on public.access_requests
for select to authenticated using (public.is_admin());

drop policy if exists "admins_update_requests" on public.access_requests;
create policy "admins_update_requests" on public.access_requests
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins_delete_requests" on public.access_requests;
create policy "admins_delete_requests" on public.access_requests
for delete to authenticated using (public.is_admin());

drop policy if exists "admins_select_attendees" on public.attendees;
create policy "admins_select_attendees" on public.attendees
for select to authenticated using (public.is_admin());

drop policy if exists "admins_update_attendees" on public.attendees;
create policy "admins_update_attendees" on public.attendees
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins_delete_attendees" on public.attendees;
create policy "admins_delete_attendees" on public.attendees
for delete to authenticated using (public.is_admin());

drop policy if exists "admin_reads_own_membership" on public.admin_users;
create policy "admin_reads_own_membership" on public.admin_users
for select to authenticated using (user_id = auth.uid());

-- Public submissions use this SECURITY DEFINER function so request + attendees are inserted atomically.
create or replace function public.submit_access_request(p_request jsonb, p_attendees jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_id uuid := gen_random_uuid();
  v_request_code text;
  v_location text;
  v_visit_date date;
  v_person jsonb;
  v_last4 text;
  v_count integer;
  v_line_no integer := 0;
begin
  if jsonb_typeof(p_request) <> 'object' then
    raise exception 'Invalid request payload';
  end if;
  if jsonb_typeof(p_attendees) <> 'array' then
    raise exception 'Attendees must be an array';
  end if;

  v_count := jsonb_array_length(p_attendees);
  if v_count < 1 or v_count > 25 then
    raise exception 'Attendee count must be between 1 and 25';
  end if;

  v_location := upper(trim(p_request->>'location'));
  if v_location not in ('TT1','TT2','MTG','BNA','RYG') then
    raise exception 'Invalid location';
  end if;

  begin
    v_visit_date := (p_request->>'visit_date')::date;
  exception when others then
    raise exception 'Invalid visit date';
  end;

  if length(trim(coalesce(p_request->>'project_name',''))) < 1
     or length(trim(coalesce(p_request->>'objective',''))) < 1
     or length(trim(coalesce(p_request->>'room',''))) < 1
     or length(trim(coalesce(p_request->>'source_file_name',''))) < 1 then
    raise exception 'Project, objective, room and source file name are required';
  end if;

  v_request_code := 'REQ-' || to_char(now() at time zone 'Asia/Bangkok', 'YYYYMMDD') || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));

  insert into public.access_requests (
    id, request_code, location, visit_date, project_name, objective, room,
    host_name, host_phone, notes, source_file_name
  ) values (
    v_request_id,
    v_request_code,
    v_location,
    v_visit_date,
    left(trim(p_request->>'project_name'),160),
    left(trim(p_request->>'objective'),240),
    left(trim(p_request->>'room'),100),
    nullif(left(trim(coalesce(p_request->>'host_name','')),160),''),
    nullif(left(trim(coalesce(p_request->>'host_phone','')),20),''),
    nullif(left(trim(coalesce(p_request->>'notes','')),1000),''),
    left(trim(p_request->>'source_file_name'),255)
  );

  for v_person in select value from jsonb_array_elements(p_attendees)
  loop
    v_line_no := v_line_no + 1;
    v_last4 := upper(trim(v_person->>'identity_last4'));
    if v_last4 !~ '^[A-Z0-9]{4}$' then
      raise exception 'Invalid ID/Passport last 4 characters at row %', v_line_no;
    end if;
    if upper(trim(v_person->>'attendee_type')) not in ('STAFF','STAFF-EMERGENCY','STAFF-TECHNICIAN','VENDOR','VISITOR') then
      raise exception 'Invalid attendee type at row %', v_line_no;
    end if;
    if upper(trim(v_person->>'card_type')) not in ('ID','PASSPORT') then
      raise exception 'Invalid card type at row %', v_line_no;
    end if;
    if length(trim(coalesce(v_person->>'company',''))) < 1
       or length(trim(coalesce(v_person->>'name',''))) < 1
       then
      raise exception 'Incomplete attendee information at row %', v_line_no;
    end if;

    insert into public.attendees (
      request_id, line_no, company, attendee_type, name, mobile, email,
      card_type, identity_last4, identity_masked, car_license
    ) values (
      v_request_id,
      v_line_no,
      left(trim(v_person->>'company'),120),
      upper(trim(v_person->>'attendee_type')),
      left(trim(v_person->>'name'),160),
      nullif(left(trim(coalesce(v_person->>'mobile','')),50),''),
      nullif(lower(left(trim(coalesce(v_person->>'email','')),160)),''),
      upper(trim(v_person->>'card_type')),
      v_last4,
      left(trim(coalesce(v_person->>'identity_masked','XXXX' || v_last4)),30),
      nullif(left(trim(coalesce(v_person->>'car_license','')),30),'')
    );
  end loop;

  return jsonb_build_object(
    'id', v_request_id,
    'request_code', v_request_code,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.submit_access_request(jsonb, jsonb) from public;
grant execute on function public.submit_access_request(jsonb, jsonb) to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists access_requests_updated_at on public.access_requests;
create trigger access_requests_updated_at
before update on public.access_requests
for each row execute function public.set_updated_at();

-- After creating an Admin user in Supabase Authentication, add the user UUID:
-- insert into public.admin_users (user_id, display_name)
-- values ('00000000-0000-0000-0000-000000000000', 'Security Admin');
