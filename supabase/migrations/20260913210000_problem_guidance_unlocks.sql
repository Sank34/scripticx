-- Paid problem guidance is kept outside public.problems so locked content can
-- never be downloaded through the normal problem query.

begin;

create table if not exists public.problem_guidance (
  problem_id uuid primary key references public.problems(id) on delete cascade,
  hint_i18n jsonb not null default '{}'::jsonb,
  solution_code text,
  hint_cost integer not null default 25,
  solution_cost integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint problem_guidance_hint_i18n_object_check
    check (jsonb_typeof(hint_i18n) = 'object'),
  constraint problem_guidance_hint_cost_check
    check (hint_cost >= 0 and hint_cost <= 1000000),
  constraint problem_guidance_solution_cost_check
    check (solution_cost >= 0 and solution_cost <= 1000000),
  constraint problem_guidance_solution_length_check
    check (solution_code is null or char_length(solution_code) <= 100000)
);

create table if not exists public.problem_content_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  content_type text not null,
  cost_points integer not null check (cost_points >= 0),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, problem_id, content_type),
  constraint problem_content_unlocks_type_check
    check (content_type in ('hint', 'solution'))
);

create index if not exists problem_content_unlocks_problem_idx
  on public.problem_content_unlocks (problem_id, content_type);

drop trigger if exists problem_guidance_set_updated_at on public.problem_guidance;
create trigger problem_guidance_set_updated_at
before update on public.problem_guidance
for each row execute function public.scripticx_set_updated_at();

alter table public.problem_guidance enable row level security;
alter table public.problem_guidance force row level security;
alter table public.problem_content_unlocks enable row level security;
alter table public.problem_content_unlocks force row level security;

revoke all on public.problem_guidance from public, anon, authenticated;
grant select, insert, update, delete on public.problem_guidance to authenticated;
revoke all on public.problem_content_unlocks from public, anon, authenticated;
grant select on public.problem_content_unlocks to authenticated;

drop policy if exists problem_guidance_admin_select on public.problem_guidance;
create policy problem_guidance_admin_select
  on public.problem_guidance for select to authenticated
  using (public.has_platform_permission('admin.problems'));

drop policy if exists problem_guidance_admin_insert on public.problem_guidance;
create policy problem_guidance_admin_insert
  on public.problem_guidance for insert to authenticated
  with check (public.has_platform_permission('admin.problems'));

drop policy if exists problem_guidance_admin_update on public.problem_guidance;
create policy problem_guidance_admin_update
  on public.problem_guidance for update to authenticated
  using (public.has_platform_permission('admin.problems'))
  with check (public.has_platform_permission('admin.problems'));

drop policy if exists problem_guidance_admin_delete on public.problem_guidance;
create policy problem_guidance_admin_delete
  on public.problem_guidance for delete to authenticated
  using (public.has_platform_permission('admin.problems'));

drop policy if exists problem_content_unlocks_select_own on public.problem_content_unlocks;
create policy problem_content_unlocks_select_own
  on public.problem_content_unlocks for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_platform_permission('admin.problems')
  );

create or replace function public.get_problem_guidance(p_problem_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_account_id uuid := auth.uid();
  v_guidance public.problem_guidance%rowtype;
  v_is_admin boolean;
  v_hint_unlocked boolean;
  v_solution_unlocked boolean;
  v_has_hint boolean := false;
  v_balance integer := 0;
begin
  if v_account_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  v_is_admin := public.has_platform_permission('admin.problems');

  select coalesce(profile.reward_points, 0)
  into v_balance
  from public.profiles as profile
  where profile.id = v_account_id;

  if not found then
    v_balance := 0;
  end if;

  if not v_is_admin and not exists (
    select 1
    from public.problems as problem
    where problem.id = p_problem_id
      and problem.visibility = 'public'
      and (problem.publish_at is null or problem.publish_at <= now())
  ) then
    return jsonb_build_object(
      'hasHint', false,
      'hasSolution', false,
      'hintI18n', null,
      'solutionCode', null,
      'hintCost', 25,
      'solutionCost', 100,
      'hintUnlocked', false,
      'solutionUnlocked', false,
      'balance', v_balance
    );
  end if;

  select guidance.*
  into v_guidance
  from public.problem_guidance as guidance
  where guidance.problem_id = p_problem_id;

  if v_guidance.problem_id is null then
    return jsonb_build_object(
      'hasHint', false,
      'hasSolution', false,
      'hintI18n', null,
      'solutionCode', null,
      'hintCost', 25,
      'solutionCost', 100,
      'hintUnlocked', false,
      'solutionUnlocked', false,
      'balance', v_balance
    );
  end if;

  select exists (
    select 1
    from jsonb_each_text(v_guidance.hint_i18n) as hint(language, hint_text)
    where btrim(hint.hint_text) <> ''
  ) into v_has_hint;

  v_hint_unlocked := v_is_admin or exists (
    select 1
    from public.problem_content_unlocks as unlock
    where unlock.user_id = v_account_id
      and unlock.problem_id = p_problem_id
      and unlock.content_type = 'hint'
  );
  v_solution_unlocked := v_is_admin or (
    exists (
      select 1
      from public.problem_content_unlocks as unlock
      where unlock.user_id = v_account_id
        and unlock.problem_id = p_problem_id
        and unlock.content_type = 'solution'
    )
    and exists (
      select 1
      from public.problem_content_unlocks as unlock
      where unlock.user_id = v_account_id
        and unlock.problem_id = p_problem_id
        and unlock.content_type = 'hint'
    )
  );

  return jsonb_build_object(
    'hasHint', v_has_hint,
    'hasSolution', v_guidance.solution_code is not null and btrim(v_guidance.solution_code) <> '',
    'hintI18n', case when v_hint_unlocked then v_guidance.hint_i18n else null end,
    'solutionCode', case when v_solution_unlocked then v_guidance.solution_code else null end,
    'hintCost', v_guidance.hint_cost,
    'solutionCost', v_guidance.solution_cost,
    'hintUnlocked', v_hint_unlocked,
    'solutionUnlocked', v_solution_unlocked,
    'balance', v_balance
  );
end;
$$;

create or replace function public.unlock_problem_content(
  p_problem_id uuid,
  p_content_type text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_account_id uuid := auth.uid();
  v_guidance public.problem_guidance%rowtype;
  v_cost integer;
  v_balance integer;
  v_has_hint boolean := false;
begin
  if v_account_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_content_type not in ('hint', 'solution') then
    raise exception 'invalid_content_type' using errcode = '22023';
  end if;

  if not public.has_platform_permission('admin.problems') and not exists (
    select 1
    from public.problems as problem
    where problem.id = p_problem_id
      and problem.visibility = 'public'
      and (problem.publish_at is null or problem.publish_at <= now())
  ) then
    raise exception 'content_unavailable' using errcode = '42704';
  end if;

  select guidance.*
  into v_guidance
  from public.problem_guidance as guidance
  where guidance.problem_id = p_problem_id
  for update;
  if not found then
    raise exception 'content_unavailable' using errcode = '42704';
  end if;

  select exists (
    select 1
    from jsonb_each_text(v_guidance.hint_i18n) as hint(language, hint_text)
    where btrim(hint.hint_text) <> ''
  ) into v_has_hint;

  if p_content_type = 'hint' and not v_has_hint then
    raise exception 'content_unavailable' using errcode = '42704';
  end if;
  if p_content_type = 'solution'
    and (v_guidance.solution_code is null or btrim(v_guidance.solution_code) = '')
  then
    raise exception 'content_unavailable' using errcode = '42704';
  end if;
  if p_content_type = 'solution' and not exists (
    select 1
    from public.problem_content_unlocks as unlock
    where unlock.user_id = v_account_id
      and unlock.problem_id = p_problem_id
      and unlock.content_type = 'hint'
  ) and not public.has_platform_permission('admin.problems') then
    raise exception 'hint_required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.problem_content_unlocks as unlock
    where unlock.user_id = v_account_id
      and unlock.problem_id = p_problem_id
      and unlock.content_type = p_content_type
  ) or public.has_platform_permission('admin.problems') then
    select coalesce(profile.reward_points, 0)
    into v_balance
    from public.profiles as profile
    where profile.id = v_account_id;
    return jsonb_build_object(
      'unlocked', true,
      'alreadyUnlocked', true,
      'contentType', p_content_type,
      'balance', coalesce(v_balance, 0)
    );
  end if;

  v_cost := case when p_content_type = 'hint' then v_guidance.hint_cost else v_guidance.solution_cost end;

  select coalesce(profile.reward_points, 0)
  into v_balance
  from public.profiles as profile
  where profile.id = v_account_id
  for update;
  if not found then
    raise exception 'profile_not_found' using errcode = '42704';
  end if;

  -- The profile lock serializes concurrent unlocks for the same account. Recheck
  -- after waiting so a second request cannot charge the same content twice.
  if exists (
    select 1
    from public.problem_content_unlocks as unlock
    where unlock.user_id = v_account_id
      and unlock.problem_id = p_problem_id
      and unlock.content_type = p_content_type
  ) then
    return jsonb_build_object(
      'unlocked', true,
      'alreadyUnlocked', true,
      'contentType', p_content_type,
      'balance', coalesce(v_balance, 0)
    );
  end if;
  if v_balance < v_cost then
    raise exception 'insufficient_reward_points' using errcode = '42501';
  end if;

  update public.profiles
  set reward_points = greatest(coalesce(reward_points, 0) - v_cost, 0)
  where id = v_account_id;

  insert into public.problem_content_unlocks (user_id, problem_id, content_type, cost_points)
  values (v_account_id, p_problem_id, p_content_type, v_cost)
  on conflict (user_id, problem_id, content_type) do nothing;

  select coalesce(profile.reward_points, 0)
  into v_balance
  from public.profiles as profile
  where profile.id = v_account_id;

  return jsonb_build_object(
    'unlocked', true,
    'alreadyUnlocked', false,
    'contentType', p_content_type,
    'cost', v_cost,
    'balance', coalesce(v_balance, 0)
  );
end;
$$;

revoke all on function public.get_problem_guidance(uuid) from public, anon, authenticated;
grant execute on function public.get_problem_guidance(uuid) to authenticated;
revoke all on function public.unlock_problem_content(uuid, text) from public, anon, authenticated;
grant execute on function public.unlock_problem_content(uuid, text) to authenticated;

commit;
