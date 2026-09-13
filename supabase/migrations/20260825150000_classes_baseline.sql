-- ScripticX classes baseline
--
-- The original class tables and their create/join RPCs pre-date the versioned
-- Supabase history. Keep this migration immediately before class_hub so a fresh
-- database can replay the complete schema. Every statement is additive or
-- replaceable so the migration can also be included safely on existing projects.

begin;

create extension if not exists pgcrypto;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp without time zone not null default now(),
  invite_code text not null,
  description text,
  subject text,
  school_year text,
  archived_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'student',
  created_at timestamp without time zone not null default now(),
  constraint class_members_role_check check (role in ('student', 'teacher')),
  constraint class_members_class_user_key unique (class_id, user_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  description text,
  problem_id uuid references public.problems(id) on delete set null,
  custom_input text,
  custom_output text,
  deadline timestamp without time zone,
  created_at timestamp without time zone not null default now(),
  problem_ids uuid[],
  status text not null default 'published',
  available_at timestamptz,
  allow_late boolean not null default true,
  max_attempts integer,
  points integer not null default 100,
  updated_at timestamptz not null default now(),
  constraint assignments_status_check
    check (status in ('draft', 'scheduled', 'published', 'closed')),
  constraint assignments_max_attempts_check
    check (max_attempts is null or max_attempts > 0),
  constraint assignments_points_check check (points >= 0)
);

create table if not exists public.assignment_problem_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null default '',
  created_at timestamp without time zone not null default now(),
  constraint assignment_problem_submissions_unique
    unique (assignment_id, problem_id, user_id)
);

-- Add the baseline columns when this migration is included on a project where
-- the legacy tables already exist. The later class_hub migration remains the
-- source for the additive class content tables.
alter table public.classes
  add column if not exists name text,
  add column if not exists teacher_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_at timestamp without time zone default now(),
  add column if not exists invite_code text,
  add column if not exists description text,
  add column if not exists subject text,
  add column if not exists school_year text,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.class_members
  add column if not exists class_id uuid references public.classes(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists role text default 'student',
  add column if not exists created_at timestamp without time zone default now();

alter table public.assignments
  add column if not exists class_id uuid references public.classes(id) on delete cascade,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists problem_id uuid references public.problems(id) on delete set null,
  add column if not exists custom_input text,
  add column if not exists custom_output text,
  add column if not exists deadline timestamp without time zone,
  add column if not exists created_at timestamp without time zone default now(),
  add column if not exists problem_ids uuid[],
  add column if not exists status text not null default 'published',
  add column if not exists available_at timestamptz,
  add column if not exists allow_late boolean not null default true,
  add column if not exists max_attempts integer,
  add column if not exists points integer not null default 100,
  add column if not exists updated_at timestamptz not null default now();

alter table public.assignment_problem_submissions
  add column if not exists assignment_id uuid references public.assignments(id) on delete cascade,
  add column if not exists problem_id uuid references public.problems(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists code text default '',
  add column if not exists created_at timestamp without time zone default now();

create unique index if not exists classes_invite_code_key
  on public.classes (invite_code);
create unique index if not exists class_members_class_user_idx
  on public.class_members (class_id, user_id);
create index if not exists class_members_user_class_idx
  on public.class_members (user_id, class_id);
create index if not exists classes_teacher_created_idx
  on public.classes (teacher_id, created_at desc);
create index if not exists assignments_class_created_idx
  on public.assignments (class_id, created_at desc);
create unique index if not exists assignment_problem_submissions_context_idx
  on public.assignment_problem_submissions (assignment_id, problem_id, user_id);
create index if not exists assignment_problem_submissions_user_created_idx
  on public.assignment_problem_submissions (user_id, created_at desc);

create or replace function public.scripticx_is_admin(
  p_user_id uuid default auth.uid()
)
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
  select coalesce(public.class_member_role(p_class_id, p_user_id), '')
    in ('admin', 'teacher');
$$;

create or replace function public.scripticx_next_class_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  next_code text;
begin
  loop
    next_code := lower(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));
    exit when not exists (
      select 1 from public.classes where invite_code = next_code
    );
  end loop;
  return next_code;
end;
$$;

-- These RPCs existed before the migration history and returned void in some
-- deployed projects. PostgreSQL cannot change a function return type through
-- CREATE OR REPLACE, so replace the legacy signatures transactionally. No
-- table data is touched and the functions remain available atomically at commit.
drop function if exists public.create_class_secure(text);
drop function if exists public.join_class_secure(text);

create or replace function public.create_class_secure(p_name text)
returns public.classes
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := auth.uid();
  result public.classes;
begin
  if account_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'Class name is required.' using errcode = '22023';
  end if;
  if char_length(trim(p_name)) > 120 then
    raise exception 'Class name is too long.' using errcode = '22023';
  end if;
  if not public.scripticx_is_admin(account_id) and not exists (
    select 1
    from public.workspace_members member
    join public.workspaces workspace on workspace.id = member.workspace_id
    where member.user_id = account_id and workspace.kind = 'teacher'
  ) then
    raise exception 'A teacher workspace is required.' using errcode = '42501';
  end if;

  insert into public.classes (name, teacher_id, invite_code)
  values (
    trim(p_name),
    account_id,
    public.scripticx_next_class_invite_code()
  )
  returning * into result;

  insert into public.class_members (class_id, user_id, role)
  values (result.id, account_id, 'teacher')
  on conflict (class_id, user_id) do update set role = 'teacher';

  return result;
end;
$$;

create or replace function public.join_class_secure(p_invite_code text)
returns public.classes
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := auth.uid();
  result public.classes;
  normalized_code text := lower(trim(p_invite_code));
begin
  if account_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if normalized_code = '' then
    raise exception 'Invitation code is required.' using errcode = '22023';
  end if;

  select * into result
  from public.classes
  where lower(invite_code) = normalized_code and archived_at is null
  for update;

  if result.id is null then
    raise exception 'Invitation code is invalid or expired.' using errcode = '22023';
  end if;
  if result.teacher_id = account_id then
    raise exception 'You already manage this class.' using errcode = '22023';
  end if;

  insert into public.class_members (class_id, user_id, role)
  values (result.id, account_id, 'student')
  on conflict (class_id, user_id) do nothing;

  return result;
end;
$$;

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_problem_submissions enable row level security;

drop policy if exists classes_read_context on public.classes;
create policy classes_read_context on public.classes
for select to authenticated using (
  public.class_member_role(id) is not null
);

drop policy if exists classes_manage_context on public.classes;
create policy classes_manage_context on public.classes
for update to authenticated using (public.can_manage_class(id))
with check (public.can_manage_class(id));

drop policy if exists classes_delete_context on public.classes;
create policy classes_delete_context on public.classes
for delete to authenticated using (public.can_manage_class(id));

drop policy if exists class_members_read_context on public.class_members;
create policy class_members_read_context on public.class_members
for select to authenticated using (
  public.class_member_role(class_id) is not null
);

drop policy if exists class_members_manage_context on public.class_members;
create policy class_members_manage_context on public.class_members
for all to authenticated using (public.can_manage_class(class_id))
with check (public.can_manage_class(class_id));

drop policy if exists assignments_read_context on public.assignments;
create policy assignments_read_context on public.assignments
for select to authenticated using (
  public.class_member_role(class_id) is not null
);

drop policy if exists assignments_manage_context on public.assignments;
create policy assignments_manage_context on public.assignments
for all to authenticated using (public.can_manage_class(class_id))
with check (public.can_manage_class(class_id));

drop policy if exists assignment_submissions_read_context
  on public.assignment_problem_submissions;
create policy assignment_submissions_read_context
on public.assignment_problem_submissions
for select to authenticated using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.assignments assignment
    where assignment.id = assignment_id
      and public.can_manage_class(assignment.class_id)
  )
);

drop policy if exists assignment_submissions_write_self
  on public.assignment_problem_submissions;
create policy assignment_submissions_write_self
on public.assignment_problem_submissions
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.assignments assignment
    where assignment.id = assignment_id
      and public.class_member_role(assignment.class_id) is not null
  )
);

drop policy if exists assignment_submissions_update_self
  on public.assignment_problem_submissions;
create policy assignment_submissions_update_self
on public.assignment_problem_submissions
for update to authenticated using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke all on function public.scripticx_next_class_invite_code() from public, anon, authenticated;
revoke all on function public.create_class_secure(text) from public, anon;
revoke all on function public.join_class_secure(text) from public, anon;
grant execute on function public.scripticx_is_admin(uuid) to authenticated;
grant execute on function public.class_member_role(uuid, uuid) to authenticated;
grant execute on function public.can_manage_class(uuid, uuid) to authenticated;
grant execute on function public.create_class_secure(text) to authenticated;
grant execute on function public.join_class_secure(text) to authenticated;
grant select, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.class_members to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update on public.assignment_problem_submissions to authenticated;

comment on function public.create_class_secure(text) is
  'Creates a class and its owner membership atomically for teacher workspaces.';
comment on function public.join_class_secure(text) is
  'Joins the authenticated account to an active class by invitation code.';

commit;
