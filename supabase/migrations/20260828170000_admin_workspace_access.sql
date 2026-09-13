begin;

create or replace function public.scripticx_ensure_admin_workspace_set(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_kind text;
  v_personal_workspace_id uuid;
  v_workspace_id uuid;
begin
  if p_user_id is null then
    raise exception 'Account is required' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_user_id
      and profile.role = 'admin'
  ) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  foreach v_kind in array array['personal', 'student', 'teacher'] loop
    insert into public.workspaces (name, kind, created_by, is_default)
    values (
      case v_kind
        when 'student' then 'Student workspace'
        when 'teacher' then 'Teacher workspace'
        else 'Personal workspace'
      end,
      v_kind,
      p_user_id,
      true
    )
    on conflict (created_by, kind) where is_default
    do update set is_default = excluded.is_default
    returning id into v_workspace_id;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (v_workspace_id, p_user_id, 'owner')
    on conflict (workspace_id, user_id)
    do update set role = 'owner';

    if v_kind = 'personal' then
      v_personal_workspace_id := v_workspace_id;
    end if;
  end loop;

  insert into public.user_workspace_settings (
    user_id,
    persona,
    active_workspace_id,
    onboarding_version,
    onboarding_completed_at
  )
  values (
    p_user_id,
    'learner',
    v_personal_workspace_id,
    1,
    now()
  )
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.scripticx_ensure_admin_workspace_set(uuid)
  from public, anon, authenticated;

create or replace function public.scripticx_sync_admin_workspaces_from_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.role = 'admin' then
    perform public.scripticx_ensure_admin_workspace_set(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.scripticx_sync_admin_workspaces_from_profile()
  from public, anon, authenticated;

drop trigger if exists profiles_sync_admin_workspaces on public.profiles;
create trigger profiles_sync_admin_workspaces
after insert or update of role on public.profiles
for each row
execute function public.scripticx_sync_admin_workspaces_from_profile();

do $$
declare
  v_admin_id uuid;
begin
  for v_admin_id in
    select profile.id
    from public.profiles as profile
    where profile.role = 'admin'
  loop
    perform public.scripticx_ensure_admin_workspace_set(v_admin_id);
  end loop;
end;
$$;

comment on function public.scripticx_ensure_admin_workspace_set(uuid) is
  'Idempotently provisions personal, student, and teacher default workspaces for a platform administrator.';

commit;
