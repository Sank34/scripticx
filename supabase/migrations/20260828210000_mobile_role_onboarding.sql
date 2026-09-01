begin;

create or replace function public.prepare_mobile_role_onboarding(
  p_persona text,
  p_action text default null,
  p_value text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_action text := nullif(trim(p_action), '');
  v_value text := nullif(trim(p_value), '');
  v_class public.classes;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_persona not in ('learner', 'student', 'teacher') then
    raise exception 'Invalid workspace persona' using errcode = '22023';
  end if;

  if v_action is not null and v_action not in ('join-class', 'create-class') then
    raise exception 'Invalid onboarding workspace action' using errcode = '22023';
  end if;

  if v_action = 'join-class' and p_persona <> 'student' then
    raise exception 'Only student onboarding can join a class' using errcode = '22023';
  end if;

  if v_action = 'create-class' and p_persona <> 'teacher' then
    raise exception 'Only teacher onboarding can create a class' using errcode = '22023';
  end if;

  if v_action is not null and v_value is null then
    raise exception 'The onboarding workspace action requires a value' using errcode = '22023';
  end if;

  perform public.provision_default_workspaces(p_persona, null);

  if v_action = 'join-class' then
    select * into v_class
    from public.join_class_secure(v_value);
  elsif v_action = 'create-class' then
    select * into v_class
    from public.create_class_secure(v_value);
  end if;

  return jsonb_build_object(
    'action', v_action,
    'class_id', v_class.id,
    'class_name', v_class.name,
    'invite_code', v_class.invite_code,
    'persona', p_persona
  );
end;
$$;

revoke all on function public.prepare_mobile_role_onboarding(text, text, text)
  from public, anon;
grant execute on function public.prepare_mobile_role_onboarding(text, text, text)
  to authenticated;

comment on function public.prepare_mobile_role_onboarding(text, text, text) is
  'Atomically provisions the selected mobile workspace and optionally joins or creates the first class.';

commit;
