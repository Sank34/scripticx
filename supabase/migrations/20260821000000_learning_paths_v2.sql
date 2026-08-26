begin;

alter table if exists public.learning_paths
  add column if not exists language text;

alter table if exists public.learning_paths
  add column if not exists kind text not null default 'specialization',
  add column if not exists prerequisite_path_id uuid references public.learning_paths(id) on delete set null,
  add column if not exists availability text not null default 'published',
  add column if not exists estimated_hours integer,
  add column if not exists icon text,
  add column if not exists accent_color text;

update public.learning_paths
set
  language = coalesce(nullif(language, ''), 'msp'),
  kind = case
    when slug = 'miniscript-plus' then 'foundation'
    when slug = 'complexity-analysis' then 'supplemental'
    else coalesce(nullif(kind, ''), 'specialization')
  end,
  availability = case
    when coalesce(is_published, true) then coalesce(nullif(availability, ''), 'published')
    else 'draft'
  end;

alter table if exists public.learning_paths
  alter column language set default 'msp',
  alter column language set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'learning_paths_kind_check'
  ) then
    alter table public.learning_paths
      add constraint learning_paths_kind_check
      check (kind in ('foundation', 'specialization', 'supplemental'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'learning_paths_availability_check'
  ) then
    alter table public.learning_paths
      add constraint learning_paths_availability_check
      check (availability in ('draft', 'coming_soon', 'published', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'learning_paths_estimated_hours_check'
  ) then
    alter table public.learning_paths
      add constraint learning_paths_estimated_hours_check
      check (estimated_hours is null or estimated_hours > 0);
  end if;
end
$$;

insert into public.learning_paths (
  id,
  slug,
  title_i18n,
  description_i18n,
  language,
  kind,
  prerequisite_path_id,
  availability,
  estimated_hours,
  icon,
  accent_color,
  order_index,
  is_published
)
select
  gen_random_uuid(),
  seed.slug,
  seed.title_i18n,
  seed.description_i18n,
  seed.language,
  'specialization',
  foundation.id,
  'coming_soon',
  seed.estimated_hours,
  seed.icon,
  seed.accent_color,
  seed.order_index,
  true
from (
  values
    (
      'python',
      '{"en":"Python","ro":"Python"}'::jsonb,
      '{"en":"Turn your algorithmic foundation into practical Python programs.","ro":"Transformă fundația algoritmică în programe practice scrise în Python."}'::jsonb,
      'python',
      24,
      'python',
      '#3776ab',
      30
    ),
    (
      'javascript',
      '{"en":"JavaScript","ro":"JavaScript"}'::jsonb,
      '{"en":"Build interactive web experiences with modern JavaScript.","ro":"Construiește experiențe web interactive cu JavaScript modern."}'::jsonb,
      'javascript',
      26,
      'javascript',
      '#f7df1e',
      40
    ),
    (
      'cpp',
      '{"en":"C++","ro":"C++"}'::jsonb,
      '{"en":"Go deeper into performance, data structures and competitive algorithms.","ro":"Aprofundează performanța, structurile de date și algoritmica de concurs."}'::jsonb,
      'cpp',
      30,
      'cpp',
      '#00599c',
      50
    )
) as seed(
  slug,
  title_i18n,
  description_i18n,
  language,
  estimated_hours,
  icon,
  accent_color,
  order_index
)
left join public.learning_paths foundation on foundation.slug = 'miniscript-plus'
where not exists (
  select 1 from public.learning_paths existing where existing.slug = seed.slug
);

alter table if exists public.lessons
  add column if not exists completion_requirement text not null default 'required',
  add column if not exists requires_correct_quiz boolean not null default false,
  add column if not exists required_problem_codes integer[] not null default '{}';

update public.lessons
set completion_requirement = case
  when slug in ('reverse-number', 'space-complexity') then 'bonus'
  when id in (
    select distinct on (unit_id) id
    from public.lessons
    where unit_id is not null
    order by unit_id, order_index desc nulls last, id
  ) then 'capstone'
  else coalesce(nullif(completion_requirement, ''), 'required')
end;

update public.lessons
set requires_correct_quiz =
  completion_requirement in ('required', 'capstone')
  and jsonb_typeof(coalesce(quiz, '[]'::jsonb)) = 'array'
  and jsonb_array_length(coalesce(quiz, '[]'::jsonb)) > 0;

update public.lessons
set required_problem_codes = coalesce(
  array(
    select value::integer
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(content_i18n #> '{__roadmap,unlockRule,requiredProblemCodes}') = 'array'
          then content_i18n #> '{__roadmap,unlockRule,requiredProblemCodes}'
        else '[]'::jsonb
      end
    ) as value
    where value ~ '^[0-9]+$'
  ),
  '{}'
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lessons_completion_requirement_check'
  ) then
    alter table public.lessons
      add constraint lessons_completion_requirement_check
      check (completion_requirement in ('required', 'optional', 'bonus', 'capstone'));
  end if;
end
$$;

create table if not exists public.user_learning_path_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  status text not null default 'selected'
    check (status in ('selected', 'active', 'paused', 'completed')),
  is_primary boolean not null default false,
  selected_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, path_id)
);

create unique index if not exists user_learning_path_one_primary_idx
  on public.user_learning_path_enrollments(user_id)
  where is_primary;

create index if not exists user_learning_path_enrollments_user_idx
  on public.user_learning_path_enrollments(user_id, updated_at desc);

create index if not exists user_learning_path_enrollments_path_idx
  on public.user_learning_path_enrollments(path_id, status);

alter table public.user_learning_path_enrollments enable row level security;

drop policy if exists user_learning_path_enrollments_select_own
  on public.user_learning_path_enrollments;
create policy user_learning_path_enrollments_select_own
  on public.user_learning_path_enrollments
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists user_learning_path_enrollments_admin_all
  on public.user_learning_path_enrollments;
create policy user_learning_path_enrollments_admin_all
  on public.user_learning_path_enrollments
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

revoke all on table public.user_learning_path_enrollments from anon;
grant select on table public.user_learning_path_enrollments to authenticated;
grant all on table public.user_learning_path_enrollments to service_role;

create or replace function public.select_learning_path(p_path_id uuid)
returns public.user_learning_path_enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_path public.learning_paths%rowtype;
  v_enrollment public.user_learning_path_enrollments%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_path
  from public.learning_paths
  where id = p_path_id
    and kind = 'specialization'
    and availability in ('published', 'coming_soon')
    and coalesce(is_published, true);

  if not found then
    raise exception 'Learning path is not available' using errcode = '22023';
  end if;

  if v_path.prerequisite_path_id is not null and not exists (
    select 1
    from public.user_learning_path_enrollments enrollment
    where enrollment.user_id = v_user_id
      and enrollment.path_id = v_path.prerequisite_path_id
      and enrollment.completed_at is not null
  ) then
    raise exception 'Learning path prerequisite is not completed' using errcode = '42501';
  end if;

  update public.user_learning_path_enrollments
  set
    is_primary = false,
    status = case when status in ('selected', 'active') then 'paused' else status end,
    updated_at = now()
  where user_id = v_user_id
    and is_primary
    and path_id <> p_path_id;

  insert into public.user_learning_path_enrollments (
    user_id,
    path_id,
    status,
    is_primary,
    selected_at,
    started_at
  )
  values (
    v_user_id,
    p_path_id,
    case when v_path.availability = 'published' then 'active' else 'selected' end,
    true,
    now(),
    case when v_path.availability = 'published' then now() else null end
  )
  on conflict (user_id, path_id) do update
  set
    status = case
      when public.user_learning_path_enrollments.completed_at is not null then 'completed'
      when v_path.availability = 'published' then 'active'
      else 'selected'
    end,
    is_primary = true,
    selected_at = now(),
    started_at = coalesce(
      public.user_learning_path_enrollments.started_at,
      case when v_path.availability = 'published' then now() else null end
    ),
    updated_at = now()
  returning * into v_enrollment;

  return v_enrollment;
end;
$$;

create or replace function public.refresh_learning_path_completion(
  p_lesson_id uuid default null,
  p_path_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_path_id uuid;
  v_path_slug text;
  v_path_kind text;
  v_required_count integer := 0;
  v_cleared_count integer := 0;
  v_previous_completed_at timestamptz;
  v_completed_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_path_id is not null then
    v_path_id := p_path_id;
  elsif p_lesson_id is not null then
    select unit.path_id into v_path_id
    from public.lessons lesson
    join public.learning_units unit on unit.id = lesson.unit_id
    where lesson.id = p_lesson_id;
  end if;

  if v_path_id is null then
    raise exception 'Learning path could not be resolved' using errcode = '22023';
  end if;

  select slug, kind into v_path_slug, v_path_kind
  from public.learning_paths
  where id = v_path_id;

  if not found then
    raise exception 'Learning path not found' using errcode = '22023';
  end if;

  select completed_at into v_previous_completed_at
  from public.user_learning_path_enrollments
  where user_id = v_user_id and path_id = v_path_id;

  select count(*)::integer into v_required_count
  from public.lessons lesson
  join public.learning_units unit on unit.id = lesson.unit_id
  where unit.path_id = v_path_id
    and coalesce(lesson.is_published, true)
    and lesson.completion_requirement in ('required', 'capstone');

  select count(*)::integer into v_cleared_count
  from public.lessons lesson
  join public.learning_units unit on unit.id = lesson.unit_id
  join public.lesson_progress progress
    on progress.lesson_id = lesson.id
   and progress.user_id = v_user_id
  where unit.path_id = v_path_id
    and coalesce(lesson.is_published, true)
    and lesson.completion_requirement in ('required', 'capstone')
    and progress.completed
    and (
      not lesson.requires_correct_quiz
      or coalesce(progress.quiz_score, 0) >= jsonb_array_length(coalesce(lesson.quiz, '[]'::jsonb))
    )
    and not exists (
      select 1
      from unnest(coalesce(lesson.required_problem_codes, '{}')) required_code
      where not exists (
        select 1
        from public.submissions submission
        join public.problems problem on problem.id = submission.problem_id
        where submission.user_id = v_user_id
          and submission.score >= 100
          and problem.code = required_code
      )
    );

  if v_required_count > 0 and v_required_count = v_cleared_count then
    insert into public.user_learning_path_enrollments (
      user_id,
      path_id,
      status,
      is_primary,
      selected_at,
      started_at,
      completed_at
    )
    values (
      v_user_id,
      v_path_id,
      'completed',
      false,
      now(),
      now(),
      now()
    )
    on conflict (user_id, path_id) do update
    set
      status = 'completed',
      completed_at = coalesce(public.user_learning_path_enrollments.completed_at, now()),
      started_at = coalesce(public.user_learning_path_enrollments.started_at, now()),
      updated_at = now()
    returning completed_at into v_completed_at;
  else
    insert into public.user_learning_path_enrollments (
      user_id,
      path_id,
      status,
      is_primary,
      selected_at,
      started_at
    )
    values (
      v_user_id,
      v_path_id,
      'active',
      v_path_kind = 'foundation',
      now(),
      now()
    )
    on conflict (user_id, path_id) do update
    set
      status = case
        when public.user_learning_path_enrollments.completed_at is not null then 'completed'
        else public.user_learning_path_enrollments.status
      end,
      started_at = coalesce(public.user_learning_path_enrollments.started_at, now()),
      updated_at = now();
  end if;

  return jsonb_build_object(
    'pathId', v_path_id,
    'pathSlug', v_path_slug,
    'completed', v_completed_at is not null or v_previous_completed_at is not null,
    'newlyCompleted', v_completed_at is not null and v_previous_completed_at is null,
    'requiredCount', v_required_count,
    'clearedCount', v_cleared_count
  );
end;
$$;

revoke all on function public.select_learning_path(uuid) from public;
grant execute on function public.select_learning_path(uuid) to authenticated;

revoke all on function public.refresh_learning_path_completion(uuid, uuid) from public;
grant execute on function public.refresh_learning_path_completion(uuid, uuid) to authenticated;

insert into public.user_learning_path_enrollments (
  user_id,
  path_id,
  status,
  is_primary,
  selected_at,
  started_at
)
select distinct
  progress.user_id,
  unit.path_id,
  'active',
  path.kind = 'foundation',
  min(coalesce(progress.updated_at, now())) over (partition by progress.user_id, unit.path_id),
  min(coalesce(progress.updated_at, now())) over (partition by progress.user_id, unit.path_id)
from public.lesson_progress progress
join public.lessons lesson on lesson.id = progress.lesson_id
join public.learning_units unit on unit.id = lesson.unit_id
join public.learning_paths path on path.id = unit.path_id
where unit.path_id is not null
on conflict (user_id, path_id) do nothing;

commit;
