begin;

alter table public.user_workspace_settings
  add column if not exists daily_goal_minutes smallint not null default 20;

alter table public.user_workspace_settings
  drop constraint if exists user_workspace_settings_daily_goal_minutes_check;

alter table public.user_workspace_settings
  add constraint user_workspace_settings_daily_goal_minutes_check
  check (daily_goal_minutes between 5 and 180);

grant select (daily_goal_minutes)
  on public.user_workspace_settings
  to authenticated;

grant update (daily_goal_minutes)
  on public.user_workspace_settings
  to authenticated;

create or replace function public.save_mobile_learning_preferences(
  p_persona text,
  p_experience_level text,
  p_learning_goal text,
  p_daily_goal_minutes integer
)
returns public.user_workspace_settings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings public.user_workspace_settings%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_persona not in ('learner', 'student', 'teacher') then
    raise exception 'Invalid workspace persona' using errcode = '22023';
  end if;

  if p_experience_level not in ('first-steps', 'beginner', 'intermediate', 'advanced') then
    raise exception 'Invalid experience level' using errcode = '22023';
  end if;

  if p_learning_goal not in (
    'learn-programming',
    'practice-algorithms',
    'prepare-interviews',
    'teach-with-scripticx'
  ) then
    raise exception 'Invalid learning goal' using errcode = '22023';
  end if;

  if p_daily_goal_minutes not between 5 and 180 then
    raise exception 'Daily goal must be between 5 and 180 minutes' using errcode = '22023';
  end if;

  perform public.provision_default_workspaces(p_persona, null);

  insert into public.user_workspace_settings (
    user_id,
    persona,
    onboarding_version,
    onboarding_completed_at,
    experience_level,
    learning_goal,
    daily_goal_minutes
  )
  values (
    v_user_id,
    p_persona,
    2,
    now(),
    p_experience_level,
    p_learning_goal,
    p_daily_goal_minutes
  )
  on conflict (user_id) do update
  set
    persona = excluded.persona,
    onboarding_version = greatest(
      public.user_workspace_settings.onboarding_version,
      excluded.onboarding_version
    ),
    onboarding_completed_at = coalesce(
      public.user_workspace_settings.onboarding_completed_at,
      excluded.onboarding_completed_at
    ),
    experience_level = excluded.experience_level,
    learning_goal = excluded.learning_goal,
    daily_goal_minutes = excluded.daily_goal_minutes,
    updated_at = now()
  returning * into v_settings;

  return v_settings;
end;
$$;

revoke all on function public.save_mobile_learning_preferences(text, text, text, integer)
  from public;
grant execute on function public.save_mobile_learning_preferences(text, text, text, integer)
  to authenticated;

alter table public.learning_paths enable row level security;
alter table public.learning_units enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;

drop policy if exists mobile_learning_paths_read_published on public.learning_paths;
create policy mobile_learning_paths_read_published
  on public.learning_paths
  for select
  to authenticated
  using (coalesce(is_published, true) and availability <> 'archived');

drop policy if exists mobile_learning_units_read_published on public.learning_units;
create policy mobile_learning_units_read_published
  on public.learning_units
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_paths path
      where path.id = learning_units.path_id
        and coalesce(path.is_published, true)
        and path.availability <> 'archived'
    )
  );

drop policy if exists mobile_lessons_read_published on public.lessons;
create policy mobile_lessons_read_published
  on public.lessons
  for select
  to authenticated
  using (
    coalesce(is_published, true)
    and exists (
      select 1
      from public.learning_units unit
      join public.learning_paths path on path.id = unit.path_id
      where unit.id = lessons.unit_id
        and coalesce(path.is_published, true)
        and path.availability <> 'archived'
    )
  );

drop policy if exists mobile_lesson_progress_read_own on public.lesson_progress;
create policy mobile_lesson_progress_read_own
  on public.lesson_progress
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists mobile_lesson_progress_insert_own on public.lesson_progress;
create policy mobile_lesson_progress_insert_own
  on public.lesson_progress
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists mobile_lesson_progress_update_own on public.lesson_progress;
create policy mobile_lesson_progress_update_own
  on public.lesson_progress
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select on public.learning_paths, public.learning_units, public.lessons
  to authenticated;
grant select, insert on public.lesson_progress
  to authenticated;
grant update (completed, completed_at, last_watched_seconds, quiz_score, updated_at)
  on public.lesson_progress
  to authenticated;

comment on function public.save_mobile_learning_preferences(text, text, text, integer) is
  'Persists mobile onboarding preferences and provisions the matching default workspaces for auth.uid().';

commit;
