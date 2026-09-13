begin;

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

  -- Learners use personal only. Students keep personal practice plus school.
  -- Teacher accounts intentionally stay focused on their teacher workspace.
  if p_persona in ('learner', 'student') then
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
  end if;

  if p_persona in ('student', 'teacher') then
    insert into public.workspaces (name, kind, created_by, is_default)
    values (
      coalesce(
        v_requested_name,
        case
          when p_persona = 'student' then 'Student workspace'
          else 'Teacher workspace'
        end
      ),
      p_persona,
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

  v_active_id := case
    when p_persona = 'teacher' then v_role_id
    else coalesce(v_role_id, v_personal_id)
  end;

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
grant execute on function public.provision_default_workspaces(text, text)
  to authenticated;

comment on function public.provision_default_workspaces(text, text) is
  'Provisions personal-only for learners, personal plus student for students, and teacher-only for teachers.';

commit;
