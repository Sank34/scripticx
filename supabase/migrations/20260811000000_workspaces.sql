-- ScripticX workspace foundation.
-- Additive only: this migration deliberately leaves profiles.role unchanged.

begin;
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  kind text not null check (kind in ('personal', 'student', 'teacher')),
  created_by uuid not null references auth.users(id) on delete cascade,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists workspaces_one_default_kind_per_user
  on public.workspaces (created_by, kind)
  where is_default;
create index if not exists workspaces_created_by_idx
  on public.workspaces (created_by, updated_at desc);
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer'
    check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id, workspace_id);
-- Private account preferences. Persona is self-selected UI intent, not an
-- authorization role and not a replacement for profiles.role.
create table if not exists public.user_workspace_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  persona text check (persona is null or persona in ('learner', 'student', 'teacher')),
  active_workspace_id uuid references public.workspaces(id) on delete set null,
  onboarding_version smallint not null default 0 check (onboarding_version >= 0),
  onboarding_completed_at timestamptz,
  experience_level text,
  learning_goal text,
  learning_interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_workspace_settings_active_idx
  on public.user_workspace_settings (active_workspace_id);
create table if not exists public.workspace_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note'
    check (char_length(title) <= 160),
  content text not null default '',
  icon text not null default '📝' check (char_length(icon) <= 16),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_notes_workspace_updated_idx
  on public.workspace_notes (workspace_id, updated_at desc);
-- Whiteboards are first-class documents. The local-first client currently
-- persists them in browser storage; this draft table is the additive server
-- shape for a later sync layer and deliberately does not replace profiles.role.
--
-- Some early ScripticX environments created a singleton whiteboard table keyed
-- only by workspace_id. CREATE TABLE IF NOT EXISTS cannot upgrade that shape,
-- so an empty legacy table must be replaced before the multi-document schema is
-- declared. Never discard a populated table automatically: fail with a clear
-- message so its rows can be migrated deliberately.
do $$
declare
  v_columns text[];
  v_primary_key_columns text[];
  v_target_columns constant text[] := array[
    'app_state',
    'created_at',
    'created_by',
    'elements',
    'files',
    'id',
    'title',
    'updated_at',
    'updated_by',
    'workspace_id'
  ];
  v_legacy_columns constant text[] := array[
    'app_state',
    'created_at',
    'elements',
    'files',
    'updated_at',
    'updated_by',
    'workspace_id'
  ];
begin
  if to_regclass('public.workspace_whiteboards') is null then
    return;
  end if;

  lock table public.workspace_whiteboards in access exclusive mode;

  select array_agg(attribute.attname::text order by attribute.attname::text)
  into v_columns
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.workspace_whiteboards'::regclass
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select array_agg(attribute.attname::text order by key_column.ordinality)
  into v_primary_key_columns
  from pg_catalog.pg_constraint as table_constraint
  cross join lateral unnest(table_constraint.conkey)
    with ordinality as key_column(attnum, ordinality)
  join pg_catalog.pg_attribute as attribute
    on attribute.attrelid = table_constraint.conrelid
   and attribute.attnum = key_column.attnum
  where table_constraint.conrelid = 'public.workspace_whiteboards'::regclass
    and table_constraint.contype = 'p';

  -- A compatible target table may contain additional future columns, but it
  -- must contain the complete v1 shape and use id as its primary key.
  if v_columns @> v_target_columns
     and v_primary_key_columns = array['id']::text[] then
    return;
  end if;

  if v_columns = v_legacy_columns
     and v_primary_key_columns = array['workspace_id']::text[] then
    if exists (select 1 from public.workspace_whiteboards limit 1) then
      raise exception using
        errcode = '55000',
        message = 'workspace_whiteboards uses the legacy singleton schema and contains data',
        hint = 'Migrate the existing whiteboard rows to id/title/created_by before applying 20260811000000_workspaces.sql.';
    end if;

    drop table public.workspace_whiteboards;
    return;
  end if;

  raise exception using
    errcode = '55000',
    message = 'workspace_whiteboards has an unsupported partial schema',
    detail = format(
      'Columns: %s; primary key: %s',
      coalesce(array_to_string(v_columns, ', '), '<none>'),
      coalesce(array_to_string(v_primary_key_columns, ', '), '<none>')
    ),
    hint = 'Reconcile the table with the multi-whiteboard schema before applying 20260811000000_workspaces.sql.';
end;
$$;
create table if not exists public.workspace_whiteboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null default 'Whiteboard'
    check (char_length(title) <= 160),
  created_by uuid not null references auth.users(id) on delete cascade,
  elements jsonb not null default '[]'::jsonb
    check (jsonb_typeof(elements) = 'array'),
  app_state jsonb not null default '{}'::jsonb
    check (jsonb_typeof(app_state) = 'object'),
  files jsonb not null default '{}'::jsonb
    check (jsonb_typeof(files) = 'object'),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_whiteboards_workspace_updated_idx
  on public.workspace_whiteboards (workspace_id, updated_at desc);
create table if not exists public.workspace_graphs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled graph'
    check (char_length(title) <= 160),
  directed boolean not null default false,
  index_mode text not null default 'zero',
  node_count integer not null default 0 check (node_count >= 0),
  custom_labels jsonb not null default '[]'::jsonb,
  source text not null default '',
  nodes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(nodes) = 'array'),
  edges jsonb not null default '[]'::jsonb
    check (jsonb_typeof(edges) = 'array'),
  image_data_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_graphs_workspace_updated_idx
  on public.workspace_graphs (workspace_id, updated_at desc);
create or replace function public.scripticx_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.scripticx_set_updated_at();
drop trigger if exists user_workspace_settings_set_updated_at on public.user_workspace_settings;
create trigger user_workspace_settings_set_updated_at
before update on public.user_workspace_settings
for each row execute function public.scripticx_set_updated_at();
drop trigger if exists workspace_notes_set_updated_at on public.workspace_notes;
create trigger workspace_notes_set_updated_at
before update on public.workspace_notes
for each row execute function public.scripticx_set_updated_at();
drop trigger if exists workspace_whiteboards_set_updated_at on public.workspace_whiteboards;
create trigger workspace_whiteboards_set_updated_at
before update on public.workspace_whiteboards
for each row execute function public.scripticx_set_updated_at();
drop trigger if exists workspace_graphs_set_updated_at on public.workspace_graphs;
create trigger workspace_graphs_set_updated_at
before update on public.workspace_graphs
for each row execute function public.scripticx_set_updated_at();
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = p_workspace_id
      and member.user_id = auth.uid()
  );
$$;
create or replace function public.workspace_member_role(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select member.role
  from public.workspace_members member
  where member.workspace_id = p_workspace_id
    and member.user_id = auth.uid()
  limit 1;
$$;
revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.workspace_member_role(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.workspace_member_role(uuid) to authenticated;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.user_workspace_settings enable row level security;
alter table public.workspace_notes enable row level security;
alter table public.workspace_whiteboards enable row level security;
alter table public.workspace_graphs enable row level security;
drop policy if exists workspaces_select_members on public.workspaces;
create policy workspaces_select_members
on public.workspaces for select
to authenticated
using (public.is_workspace_member(id));
drop policy if exists workspaces_update_owners on public.workspaces;
create policy workspaces_update_owners
on public.workspaces for update
to authenticated
using (public.workspace_member_role(id) = 'owner')
with check (created_by = auth.uid());
drop policy if exists workspaces_delete_owners on public.workspaces;
create policy workspaces_delete_owners
on public.workspaces for delete
to authenticated
using (public.workspace_member_role(id) = 'owner');
drop policy if exists workspace_members_select_members on public.workspace_members;
create policy workspace_members_select_members
on public.workspace_members for select
to authenticated
using (public.is_workspace_member(workspace_id));
-- Membership creation and role changes intentionally go through trusted RPCs.
drop policy if exists user_workspace_settings_select_own on public.user_workspace_settings;
create policy user_workspace_settings_select_own
on public.user_workspace_settings for select
to authenticated
using (user_id = auth.uid());
drop policy if exists user_workspace_settings_update_own on public.user_workspace_settings;
create policy user_workspace_settings_update_own
on public.user_workspace_settings for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    active_workspace_id is null
    or public.is_workspace_member(active_workspace_id)
  )
);
drop policy if exists workspace_notes_select_members on public.workspace_notes;
create policy workspace_notes_select_members
on public.workspace_notes for select
to authenticated
using (public.is_workspace_member(workspace_id));
drop policy if exists workspace_notes_insert_editors on public.workspace_notes;
create policy workspace_notes_insert_editors
on public.workspace_notes for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.workspace_member_role(workspace_id) in ('owner', 'editor')
);
drop policy if exists workspace_notes_update_editors on public.workspace_notes;
create policy workspace_notes_update_editors
on public.workspace_notes for update
to authenticated
using (public.workspace_member_role(workspace_id) in ('owner', 'editor'))
with check (public.workspace_member_role(workspace_id) in ('owner', 'editor'));
drop policy if exists workspace_notes_delete_editors on public.workspace_notes;
create policy workspace_notes_delete_editors
on public.workspace_notes for delete
to authenticated
using (public.workspace_member_role(workspace_id) in ('owner', 'editor'));
drop policy if exists workspace_whiteboards_select_members on public.workspace_whiteboards;
create policy workspace_whiteboards_select_members
on public.workspace_whiteboards for select
to authenticated
using (public.is_workspace_member(workspace_id));
drop policy if exists workspace_whiteboards_insert_editors on public.workspace_whiteboards;
create policy workspace_whiteboards_insert_editors
on public.workspace_whiteboards for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and public.workspace_member_role(workspace_id) in ('owner', 'editor')
);
drop policy if exists workspace_whiteboards_update_editors on public.workspace_whiteboards;
create policy workspace_whiteboards_update_editors
on public.workspace_whiteboards for update
to authenticated
using (public.workspace_member_role(workspace_id) in ('owner', 'editor'))
with check (
  updated_by = auth.uid()
  and public.workspace_member_role(workspace_id) in ('owner', 'editor')
);
drop policy if exists workspace_whiteboards_delete_owners on public.workspace_whiteboards;
drop policy if exists workspace_whiteboards_delete_editors on public.workspace_whiteboards;
create policy workspace_whiteboards_delete_editors
on public.workspace_whiteboards for delete
to authenticated
using (public.workspace_member_role(workspace_id) in ('owner', 'editor'));
drop policy if exists workspace_graphs_select_members on public.workspace_graphs;
create policy workspace_graphs_select_members
on public.workspace_graphs for select
to authenticated
using (public.is_workspace_member(workspace_id));
drop policy if exists workspace_graphs_insert_editors on public.workspace_graphs;
create policy workspace_graphs_insert_editors
on public.workspace_graphs for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.workspace_member_role(workspace_id) in ('owner', 'editor')
);
drop policy if exists workspace_graphs_update_editors on public.workspace_graphs;
create policy workspace_graphs_update_editors
on public.workspace_graphs for update
to authenticated
using (public.workspace_member_role(workspace_id) in ('owner', 'editor'))
with check (public.workspace_member_role(workspace_id) in ('owner', 'editor'));
drop policy if exists workspace_graphs_delete_editors on public.workspace_graphs;
create policy workspace_graphs_delete_editors
on public.workspace_graphs for delete
to authenticated
using (public.workspace_member_role(workspace_id) in ('owner', 'editor'));
revoke all on public.workspaces from anon, authenticated;
revoke all on public.workspace_members from anon, authenticated;
revoke all on public.user_workspace_settings from anon, authenticated;
revoke all on public.workspace_notes from anon, authenticated;
revoke all on public.workspace_whiteboards from anon, authenticated;
revoke all on public.workspace_graphs from anon, authenticated;
grant select, delete on public.workspaces to authenticated;
grant update (name) on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select on public.user_workspace_settings to authenticated;
grant update (
  active_workspace_id,
  experience_level,
  learning_goal,
  learning_interests
) on public.user_workspace_settings to authenticated;
grant select, insert, delete on public.workspace_notes to authenticated;
grant update (title, content, icon, favorite)
  on public.workspace_notes to authenticated;
grant select, insert, delete on public.workspace_whiteboards to authenticated;
grant update (title, elements, app_state, files, updated_by)
  on public.workspace_whiteboards to authenticated;
grant select, insert, delete on public.workspace_graphs to authenticated;
grant update (
  title,
  directed,
  index_mode,
  node_count,
  custom_labels,
  source,
  nodes,
  edges,
  image_data_url
) on public.workspace_graphs to authenticated;
create or replace function public.provision_default_workspaces(
  p_persona text,
  p_workspace_name text default null
)
returns table (
  active_workspace_id uuid,
  personal_workspace_id uuid,
  role_workspace_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_personal_id uuid;
  v_role_id uuid;
  v_active_id uuid;
  v_role_kind text;
  v_requested_name text := nullif(trim(p_workspace_name), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_persona is null or p_persona not in ('learner', 'student', 'teacher') then
    raise exception 'Invalid workspace persona' using errcode = '22023';
  end if;

  if v_requested_name is not null and char_length(v_requested_name) > 120 then
    raise exception 'Workspace name is too long' using errcode = '22023';
  end if;

  insert into public.workspaces (name, kind, created_by, is_default)
  values (
    case
      when p_persona = 'learner' and v_requested_name is not null
        then v_requested_name
      else 'Personal workspace'
    end,
    'personal',
    v_user_id,
    true
  )
  on conflict (created_by, kind) where is_default
  do update set is_default = excluded.is_default
  returning id into v_personal_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_personal_id, v_user_id, 'owner')
  on conflict (workspace_id, user_id)
  do update set role = 'owner';

  if p_persona in ('student', 'teacher') then
    v_role_kind := p_persona;

    insert into public.workspaces (name, kind, created_by, is_default)
    values (
      coalesce(
        v_requested_name,
        case
          when p_persona = 'student' then 'Student workspace'
          else 'Teacher workspace'
        end
      ),
      v_role_kind,
      v_user_id,
      true
    )
    on conflict (created_by, kind) where is_default
    do update set is_default = excluded.is_default
    returning id into v_role_id;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (v_role_id, v_user_id, 'owner')
    on conflict (workspace_id, user_id)
    do update set role = 'owner';
  end if;

  v_active_id := coalesce(v_role_id, v_personal_id);

  insert into public.user_workspace_settings (
    user_id,
    persona,
    active_workspace_id,
    onboarding_version,
    onboarding_completed_at
  )
  values (v_user_id, p_persona, v_active_id, 1, now())
  on conflict (user_id)
  do update set
    persona = excluded.persona,
    active_workspace_id = excluded.active_workspace_id,
    onboarding_version = greatest(
      public.user_workspace_settings.onboarding_version,
      excluded.onboarding_version
    ),
    onboarding_completed_at = coalesce(
      public.user_workspace_settings.onboarding_completed_at,
      excluded.onboarding_completed_at
    );

  return query select v_active_id, v_personal_id, v_role_id;
end;
$$;
revoke all on function public.provision_default_workspaces(text, text) from public;
grant execute on function public.provision_default_workspaces(text, text) to authenticated;
comment on column public.user_workspace_settings.persona is
  'Self-selected UX persona only. Never use as an authorization role.';
comment on table public.workspace_whiteboards is
  'Multiple named whiteboard documents per workspace; browser storage remains the current source until sync is wired.';
comment on function public.provision_default_workspaces(text, text) is
  'Idempotently creates a personal workspace and an optional persona workspace for auth.uid().';
commit;
