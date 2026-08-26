-- ScripticX Class Hub
-- Additive migration: keeps the existing classes, memberships, assignments,
-- and canonical assignment submissions compatible with the current product.

create extension if not exists pgcrypto;

create or replace function public.scripticx_is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id and role = 'admin'
  );
$$;

create or replace function public.class_member_role(
  p_class_id uuid,
  p_user_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.scripticx_is_admin(p_user_id) then 'admin'
    when exists (
      select 1 from public.classes
      where id = p_class_id and teacher_id = p_user_id
    ) then 'teacher'
    else (
      select role::text
      from public.class_members
      where class_id = p_class_id and user_id = p_user_id
      limit 1
    )
  end;
$$;

create or replace function public.can_manage_class(
  p_class_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.class_member_role(p_class_id, p_user_id), '') in ('admin', 'teacher');
$$;

alter table public.classes
  add column if not exists description text,
  add column if not exists subject text,
  add column if not exists school_year text,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.assignments
  add column if not exists problem_ids uuid[],
  add column if not exists status text not null default 'published',
  add column if not exists available_at timestamptz,
  add column if not exists allow_late boolean not null default true,
  add column if not exists max_attempts integer,
  add column if not exists points integer not null default 100,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assignments_status_check'
  ) then
    alter table public.assignments add constraint assignments_status_check
      check (status in ('draft', 'scheduled', 'published', 'closed'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'assignments_max_attempts_check'
  ) then
    alter table public.assignments add constraint assignments_max_attempts_check
      check (max_attempts is null or max_attempts > 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'assignments_points_check'
  ) then
    alter table public.assignments add constraint assignments_points_check
      check (points >= 0);
  end if;
end $$;

create table if not exists public.class_announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  status text not null default 'published' check (status in ('draft', 'scheduled', 'published')),
  pinned boolean not null default false,
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_resources (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  resource_type text not null default 'link'
    check (resource_type in ('link', 'document', 'note', 'whiteboard', 'file')),
  url text,
  linked_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_events (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  event_type text not null default 'event'
    check (event_type in ('event', 'lesson', 'test', 'project', 'office_hours')),
  linked_assignment_id uuid references public.assignments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_assignment_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null default '',
  language text not null default 'miniscript',
  attempt_number integer not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'accepted', 'partial', 'rejected')),
  score numeric(7, 2),
  feedback text,
  submitted_at timestamptz not null default now(),
  graded_by uuid references auth.users(id) on delete set null,
  graded_at timestamptz,
  unique (assignment_id, problem_id, user_id, attempt_number)
);

create index if not exists class_announcements_class_published_idx
  on public.class_announcements(class_id, pinned desc, published_at desc);
create index if not exists class_resources_class_created_idx
  on public.class_resources(class_id, created_at desc);
create index if not exists class_events_class_starts_idx
  on public.class_events(class_id, starts_at);
create index if not exists class_assignment_attempts_lookup_idx
  on public.class_assignment_attempts(assignment_id, user_id, problem_id, attempt_number desc);
create index if not exists assignments_class_deadline_idx
  on public.assignments(class_id, deadline);

create or replace function public.scripticx_class_hub_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array['classes', 'assignments', 'class_announcements', 'class_resources', 'class_events']
  loop
    trigger_name := 'touch_' || table_name || '_updated_at';
    if not exists (
      select 1 from pg_trigger where tgname = trigger_name and not tgisinternal
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.scripticx_class_hub_touch_updated_at()',
        trigger_name,
        table_name
      );
    end if;
  end loop;
end $$;

create or replace function public.regenerate_class_invite(p_class_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_code text;
begin
  if not public.can_manage_class(p_class_id) then
    raise exception 'You do not have permission to manage this class.';
  end if;

  loop
    next_code := lower(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));
    exit when not exists (select 1 from public.classes where invite_code = next_code);
  end loop;

  update public.classes set invite_code = next_code where id = p_class_id;
  return next_code;
end;
$$;

create or replace function public.update_class_details(
  p_class_id uuid,
  p_name text,
  p_description text default null,
  p_subject text default null,
  p_school_year text default null,
  p_archive boolean default false
)
returns public.classes
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.classes;
begin
  if not public.can_manage_class(p_class_id) then
    raise exception 'You do not have permission to manage this class.';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'Class name is required.';
  end if;
  update public.classes
  set name = trim(p_name),
      description = nullif(trim(p_description), ''),
      subject = nullif(trim(p_subject), ''),
      school_year = nullif(trim(p_school_year), ''),
      archived_at = case when p_archive then now() else archived_at end
  where id = p_class_id
  returning * into result;
  return result;
end;
$$;

create or replace function public.manage_class_member(
  p_class_id uuid,
  p_user_id uuid,
  p_action text,
  p_role text default 'student'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_class(p_class_id) then
    raise exception 'You do not have permission to manage class members.';
  end if;
  if p_user_id = auth.uid() and p_action = 'remove' then
    raise exception 'Class owners cannot remove themselves.';
  end if;

  if p_action = 'remove' then
    delete from public.class_members where class_id = p_class_id and user_id = p_user_id;
  elsif p_action = 'role' then
    if p_role not in ('student', 'teacher') then
      raise exception 'Invalid class role.';
    end if;
    update public.class_members set role = p_role where class_id = p_class_id and user_id = p_user_id;
  else
    raise exception 'Invalid member action.';
  end if;
end;
$$;

create or replace function public.submit_class_assignment_attempt(
  p_assignment_id uuid,
  p_problem_id uuid,
  p_code text,
  p_language text default 'miniscript'
)
returns public.class_assignment_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_row public.assignments%rowtype;
  next_attempt integer;
  result public.class_assignment_attempts;
begin
  select * into assignment_row from public.assignments where id = p_assignment_id;
  if assignment_row.id is null then raise exception 'Assignment not found.'; end if;
  if public.class_member_role(assignment_row.class_id) is null then
    raise exception 'You are not a member of this class.';
  end if;
  if assignment_row.status not in ('published', 'scheduled')
     or (assignment_row.available_at is not null and assignment_row.available_at > now()) then
    raise exception 'This assignment is not available.';
  end if;
  if assignment_row.deadline is not null and assignment_row.deadline < now() and not assignment_row.allow_late then
    raise exception 'The deadline has passed.';
  end if;

  select coalesce(max(attempt_number), 0) + 1 into next_attempt
  from public.class_assignment_attempts
  where assignment_id = p_assignment_id and problem_id = p_problem_id and user_id = auth.uid();

  if assignment_row.max_attempts is not null and next_attempt > assignment_row.max_attempts then
    raise exception 'The maximum number of attempts has been reached.';
  end if;

  insert into public.class_assignment_attempts (
    assignment_id, problem_id, user_id, code, language, attempt_number
  ) values (
    p_assignment_id, p_problem_id, auth.uid(), p_code, p_language, next_attempt
  ) returning * into result;

  return result;
end;
$$;

alter table public.class_announcements enable row level security;
alter table public.class_resources enable row level security;
alter table public.class_events enable row level security;
alter table public.class_assignment_attempts enable row level security;

drop policy if exists class_announcements_read_members on public.class_announcements;
create policy class_announcements_read_members on public.class_announcements
for select to authenticated using (
  public.class_member_role(class_id) is not null
  and (status = 'published' or public.can_manage_class(class_id))
);
drop policy if exists class_announcements_manage_teachers on public.class_announcements;
create policy class_announcements_manage_teachers on public.class_announcements
for all to authenticated using (public.can_manage_class(class_id))
with check (public.can_manage_class(class_id) and author_id = auth.uid());

drop policy if exists class_resources_read_members on public.class_resources;
create policy class_resources_read_members on public.class_resources
for select to authenticated using (public.class_member_role(class_id) is not null);
drop policy if exists class_resources_manage_teachers on public.class_resources;
create policy class_resources_manage_teachers on public.class_resources
for all to authenticated using (public.can_manage_class(class_id))
with check (public.can_manage_class(class_id) and created_by = auth.uid());

drop policy if exists class_events_read_members on public.class_events;
create policy class_events_read_members on public.class_events
for select to authenticated using (public.class_member_role(class_id) is not null);
drop policy if exists class_events_manage_teachers on public.class_events;
create policy class_events_manage_teachers on public.class_events
for all to authenticated using (public.can_manage_class(class_id))
with check (public.can_manage_class(class_id) and created_by = auth.uid());

drop policy if exists class_attempts_read_context on public.class_assignment_attempts;
create policy class_attempts_read_context on public.class_assignment_attempts
for select to authenticated using (
  user_id = auth.uid()
  or exists (
    select 1 from public.assignments a
    where a.id = assignment_id and public.can_manage_class(a.class_id)
  )
);
drop policy if exists class_attempts_insert_self on public.class_assignment_attempts;
create policy class_attempts_insert_self on public.class_assignment_attempts
for insert to authenticated with check (user_id = auth.uid());
drop policy if exists class_attempts_grade_teachers on public.class_assignment_attempts;
create policy class_attempts_grade_teachers on public.class_assignment_attempts
for update to authenticated using (
  exists (
    select 1 from public.assignments a
    where a.id = assignment_id and public.can_manage_class(a.class_id)
  )
) with check (
  exists (
    select 1 from public.assignments a
    where a.id = assignment_id and public.can_manage_class(a.class_id)
  )
);

grant execute on function public.scripticx_is_admin(uuid) to authenticated;
grant execute on function public.class_member_role(uuid, uuid) to authenticated;
grant execute on function public.can_manage_class(uuid, uuid) to authenticated;
grant execute on function public.regenerate_class_invite(uuid) to authenticated;
grant execute on function public.update_class_details(uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.manage_class_member(uuid, uuid, text, text) to authenticated;
grant execute on function public.submit_class_assignment_attempt(uuid, uuid, text, text) to authenticated;
grant select, insert, update, delete on public.class_announcements to authenticated;
grant select, insert, update, delete on public.class_resources to authenticated;
grant select, insert, update, delete on public.class_events to authenticated;
grant select, insert, update on public.class_assignment_attempts to authenticated;
