begin;

create table if not exists public.workspace_calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  color text not null default 'sky'
    check (color in ('sky', 'violet', 'amber', 'rose', 'emerald', 'slate')),
  location text check (location is null or char_length(location) <= 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at),
  check (description is null or char_length(description) <= 5000)
);

create index if not exists workspace_calendar_events_range_idx
  on public.workspace_calendar_events (workspace_id, starts_at, ends_at);

create table if not exists public.workspace_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  due_at timestamptz not null,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed')),
  progress smallint not null default 0 check (progress between 0 and 100),
  color text not null default 'violet'
    check (color in ('sky', 'violet', 'amber', 'rose', 'emerald', 'slate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (description is null or char_length(description) <= 5000)
);

create index if not exists workspace_projects_due_idx
  on public.workspace_projects (workspace_id, due_at);

drop trigger if exists workspace_calendar_events_set_updated_at
  on public.workspace_calendar_events;
create trigger workspace_calendar_events_set_updated_at
before update on public.workspace_calendar_events
for each row execute function public.scripticx_set_updated_at();

drop trigger if exists workspace_projects_set_updated_at
  on public.workspace_projects;
create trigger workspace_projects_set_updated_at
before update on public.workspace_projects
for each row execute function public.scripticx_set_updated_at();

alter table public.workspace_calendar_events enable row level security;
alter table public.workspace_projects enable row level security;

drop policy if exists workspace_calendar_events_select_members
  on public.workspace_calendar_events;
create policy workspace_calendar_events_select_members
on public.workspace_calendar_events for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_calendar_events_insert_editors
  on public.workspace_calendar_events;
create policy workspace_calendar_events_insert_editors
on public.workspace_calendar_events for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.workspace_member_role(workspace_id) in ('owner', 'editor')
);

drop policy if exists workspace_calendar_events_update_editors
  on public.workspace_calendar_events;
create policy workspace_calendar_events_update_editors
on public.workspace_calendar_events for update
to authenticated
using (
  created_by = auth.uid()
  and public.workspace_member_role(workspace_id) in ('owner', 'editor')
)
with check (
  created_by = auth.uid()
  and public.workspace_member_role(workspace_id) in ('owner', 'editor')
);

drop policy if exists workspace_calendar_events_delete_editors
  on public.workspace_calendar_events;
create policy workspace_calendar_events_delete_editors
on public.workspace_calendar_events for delete
to authenticated
using (
  created_by = auth.uid()
  and public.workspace_member_role(workspace_id) in ('owner', 'editor')
);

drop policy if exists workspace_projects_select_members
  on public.workspace_projects;
create policy workspace_projects_select_members
on public.workspace_projects for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_projects_insert_editors
  on public.workspace_projects;
create policy workspace_projects_insert_editors
on public.workspace_projects for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.workspace_member_role(workspace_id) in ('owner', 'editor')
);

drop policy if exists workspace_projects_update_editors
  on public.workspace_projects;
create policy workspace_projects_update_editors
on public.workspace_projects for update
to authenticated
using (
  created_by = auth.uid()
  and public.workspace_member_role(workspace_id) in ('owner', 'editor')
)
with check (
  created_by = auth.uid()
  and public.workspace_member_role(workspace_id) in ('owner', 'editor')
);

drop policy if exists workspace_projects_delete_editors
  on public.workspace_projects;
create policy workspace_projects_delete_editors
on public.workspace_projects for delete
to authenticated
using (
  created_by = auth.uid()
  and public.workspace_member_role(workspace_id) in ('owner', 'editor')
);

revoke all on public.workspace_calendar_events from anon, authenticated;
revoke all on public.workspace_projects from anon, authenticated;

grant select, insert, delete on public.workspace_calendar_events to authenticated;
grant update (title, description, starts_at, ends_at, all_day, color, location)
  on public.workspace_calendar_events to authenticated;

grant select, insert, delete on public.workspace_projects to authenticated;
grant update (title, description, due_at, status, progress, color)
  on public.workspace_projects to authenticated;

comment on table public.workspace_calendar_events is
  'Student workspace personal events. Class assignments remain canonical in public.assignments.';
comment on table public.workspace_projects is
  'Personal student projects surfaced alongside events and class assignments in Planner.';

commit;
