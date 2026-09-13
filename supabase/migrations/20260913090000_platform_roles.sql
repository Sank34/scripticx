begin;

create table public.platform_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  description text not null default '' check (char_length(description) <= 500),
  permissions text[] not null default '{}' check (permissions <@ array['admin.classes','admin.live','admin.groups','admin.analytics','admin.tasks','admin.users','admin.problems','admin.competitions','admin.lessons','admin.workshops','admin.shop','admin.badges','admin.updates','admin.announcements','admin.contact','admin.email','admin.design-system','admin.moderation','admin.platform','admin.daily','admin.certificates','maintenance.bypass','competition.bypass']::text[] and array_position(permissions, null) is null),
  created_at timestamptz not null default now()
);
create unique index platform_roles_name_unique on public.platform_roles (lower(trim(name)));
create table public.platform_user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.platform_roles(id) on delete cascade,
  primary key (user_id, role_id)
);
create index platform_user_roles_role_idx on public.platform_user_roles(role_id);
create table public.platform_role_audit (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
alter table public.platform_roles enable row level security;
alter table public.platform_user_roles enable row level security;
alter table public.platform_role_audit enable row level security;
create policy roles_admin on public.platform_roles for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy user_roles_admin on public.platform_user_roles for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy role_audit_admin on public.platform_role_audit for select to authenticated using (public.is_platform_admin());
grant select, insert, update, delete on public.platform_roles, public.platform_user_roles to authenticated;
grant select on public.platform_role_audit to authenticated;
grant all on public.platform_roles, public.platform_user_roles, public.platform_role_audit to service_role;

create function public.platform_role_audit_change() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.platform_role_audit(actor_id,action,entity,old_value,new_value)
  values(auth.uid(),tg_op,tg_table_name,to_jsonb(old),to_jsonb(new));
  return coalesce(new,old);
end;
$$;
revoke all on function public.platform_role_audit_change() from public;
create trigger platform_roles_audit after insert or update or delete on public.platform_roles for each row execute function public.platform_role_audit_change();
create trigger platform_user_roles_audit after insert or update or delete on public.platform_user_roles for each row execute function public.platform_role_audit_change();

create function public.platform_user_permissions(p_user_id uuid default auth.uid()) returns text[]
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare result text[];
begin
  if auth.role() is distinct from 'service_role' and (auth.uid() is null or p_user_id is distinct from auth.uid()) then
    raise exception 'Cannot read another account permissions' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=p_user_id and not coalesce(banned,false)) then return '{}'; end if;
  if exists(select 1 from public.profiles where id=p_user_id and role='admin') then return array['admin.classes','admin.live','admin.groups','admin.analytics','admin.tasks','admin.users','admin.problems','admin.competitions','admin.lessons','admin.workshops','admin.shop','admin.badges','admin.updates','admin.announcements','admin.contact','admin.email','admin.design-system','admin.moderation','admin.platform','admin.daily','admin.certificates','maintenance.bypass','competition.bypass']::text[]; end if;
  select coalesce(array_agg(distinct permission), '{}'::text[]) into result
  from public.platform_user_roles ur join public.platform_roles r on r.id=ur.role_id
  cross join lateral unnest(r.permissions) permission where ur.user_id=p_user_id;
  return result;
end;
$$;
revoke all on function public.platform_user_permissions(uuid) from public;
grant execute on function public.platform_user_permissions(uuid) to authenticated,service_role;

create function public.has_platform_permission(p_permission text) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare permissions text[]; settings public.platform_settings%rowtype;
begin
  if auth.uid() is null then return false; end if;
  permissions := public.platform_user_permissions();
  if not (p_permission = any(permissions)) then return false; end if;
  if p_permission in ('maintenance.bypass','competition.bypass') then return true; end if;
  select * into settings from public.platform_settings where id='global';
  if settings.lockdown_enabled then
    if coalesce(settings.lockdown_mode,'maintenance') = 'maintenance' and not ('maintenance.bypass' = any(permissions)) then return false; end if;
    if settings.lockdown_mode = 'competition' and not ('competition.bypass' = any(permissions)) and exists(select 1 from public.competition_participants where user_id=auth.uid() and status='active') then return false; end if;
  end if;
  return true;
end;
$$;
revoke all on function public.has_platform_permission(text) from public;
grant execute on function public.has_platform_permission(text) to authenticated,service_role,anon;

create or replace function public.platform_access_allowed() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select not exists(select 1 from public.profiles where id=auth.uid() and coalesce(banned,false)) and (
    coalesce((select not lockdown_enabled or lockdown_mode='competition' from public.platform_settings where id='global'),true)
    or public.has_platform_permission('maintenance.bypass')
  );
$$;

alter policy "certificates_admin_delete" on public.certificates using (public.has_platform_permission('admin.certificates'));

alter policy "certificates_admin_insert" on public.certificates with check (public.has_platform_permission('admin.certificates'));

alter policy "certificates_admin_update" on public.certificates using (public.has_platform_permission('admin.certificates')) with check (public.has_platform_permission('admin.certificates'));

alter policy "admins manage learning paths" on public.learning_paths using (public.has_platform_permission('admin.lessons')) with check (public.has_platform_permission('admin.lessons'));

alter policy "read published learning paths" on public.learning_paths using (((is_published = true) OR public.has_platform_permission('admin.lessons')));

alter policy "admins manage lessons" on public.lessons using (public.has_platform_permission('admin.lessons')) with check (public.has_platform_permission('admin.lessons'));

alter policy "read published lessons" on public.lessons using ((((is_published = true) AND (EXISTS ( SELECT 1
   FROM (learning_units u
     JOIN learning_paths p ON ((p.id = u.path_id)))
  WHERE ((u.id = lessons.unit_id) AND (u.is_published = true) AND (p.is_published = true))))) OR public.has_platform_permission('admin.lessons')));

alter policy "user_learning_path_enrollments_admin_all" on public.user_learning_path_enrollments using ((public.has_platform_permission('admin.lessons'))) with check ((public.has_platform_permission('admin.lessons')));

alter policy "daily_challenges_admin_delete" on public.daily_challenges using (public.has_platform_permission('admin.daily'));

alter policy "daily_challenges_admin_insert" on public.daily_challenges with check ((public.has_platform_permission('admin.daily') AND (created_by = auth.uid())));

alter policy "daily_challenges_admin_update" on public.daily_challenges using (public.has_platform_permission('admin.daily')) with check (public.has_platform_permission('admin.daily'));

alter policy "user_achievements_admin_manage" on public.user_achievements using (public.has_platform_permission('admin.badges')) with check (public.has_platform_permission('admin.badges'));

alter policy "problem_catalog_admin_insert" on public.problem_catalog with check (public.has_platform_permission('admin.problems'));

alter policy "problem_catalog_admin_update" on public.problem_catalog using (public.has_platform_permission('admin.problems')) with check (public.has_platform_permission('admin.problems'));

alter policy "admins manage lesson problems" on public.lesson_problems using (public.has_platform_permission('admin.lessons')) with check (public.has_platform_permission('admin.lessons'));

alter policy "read lesson problems" on public.lesson_problems using (((EXISTS ( SELECT 1
   FROM lessons l
  WHERE ((l.id = lesson_problems.lesson_id) AND (l.is_published = true)))) OR public.has_platform_permission('admin.lessons')));

alter policy "admins can manage updates" on public.updates using ((public.has_platform_permission('admin.updates'))) with check ((public.has_platform_permission('admin.updates')));

alter policy "platform_settings_admin_write" on public.platform_settings using (public.has_platform_permission('admin.platform')) with check (public.has_platform_permission('admin.platform'));

alter policy "competition_invites_admin_only" on public.competition_invites using ((platform_access_allowed() AND public.has_platform_permission('admin.competitions'))) with check ((platform_access_allowed() AND public.has_platform_permission('admin.competitions')));

alter policy "competition_breaks_admin_write" on public.competition_breaks using ((platform_access_allowed() AND public.has_platform_permission('admin.competitions'))) with check ((platform_access_allowed() AND public.has_platform_permission('admin.competitions')));

alter policy "competition_problems_admin_write" on public.competition_problems using ((platform_access_allowed() AND public.has_platform_permission('admin.competitions'))) with check ((platform_access_allowed() AND public.has_platform_permission('admin.competitions')));

alter policy "competition_participants_admin_write" on public.competition_participants using ((platform_access_allowed() AND public.has_platform_permission('admin.competitions'))) with check ((platform_access_allowed() AND public.has_platform_permission('admin.competitions')));

alter policy "competition_participants_read" on public.competition_participants using ((platform_access_allowed() AND ((user_id = auth.uid()) OR public.has_platform_permission('admin.competitions'))));

alter policy "competition_submissions_admin_update" on public.competition_submissions using ((platform_access_allowed() AND public.has_platform_permission('admin.competitions'))) with check ((platform_access_allowed() AND public.has_platform_permission('admin.competitions')));

alter policy "competition_submissions_read" on public.competition_submissions using ((platform_access_allowed() AND ((user_id = auth.uid()) OR public.has_platform_permission('admin.competitions'))));

alter policy "competitions_admin_write" on public.competitions using ((platform_access_allowed() AND public.has_platform_permission('admin.competitions'))) with check ((platform_access_allowed() AND public.has_platform_permission('admin.competitions')));

alter policy "competitions_read" on public.competitions using ((platform_access_allowed() AND (public.has_platform_permission('admin.competitions') OR ((status = 'published'::text) AND ((visibility = 'public'::text) OR (EXISTS ( SELECT 1
   FROM competition_participants participant
  WHERE ((participant.competition_id = competitions.id) AND (participant.user_id = auth.uid()) AND (participant.status = 'active'::text)))))))));

alter policy "admins manage tasks" on public.admin_tasks using (public.has_platform_permission('admin.tasks')) with check (public.has_platform_permission('admin.tasks'));

alter policy "admins manage dismissals" on public.admin_attention_dismissals using (public.has_platform_permission('admin.tasks')) with check (public.has_platform_permission('admin.tasks'));

alter policy "problems_admin_delete" on public.problems using (public.has_platform_permission('admin.problems'));

alter policy "problems_admin_delete_guard" on public.problems using ((platform_access_allowed() AND public.has_platform_permission('admin.problems')));

alter policy "problems_admin_insert" on public.problems with check (public.has_platform_permission('admin.problems'));

alter policy "problems_admin_insert_guard" on public.problems with check ((platform_access_allowed() AND public.has_platform_permission('admin.problems')));

alter policy "problems_admin_update" on public.problems using (public.has_platform_permission('admin.problems')) with check (public.has_platform_permission('admin.problems'));

alter policy "problems_admin_update_guard" on public.problems using ((platform_access_allowed() AND public.has_platform_permission('admin.problems'))) with check ((platform_access_allowed() AND public.has_platform_permission('admin.problems')));

alter policy "problems_visibility_guard" on public.problems using ((platform_access_allowed() AND (public.has_platform_permission('admin.problems') OR ((visibility = 'public'::text) AND ((publish_at IS NULL) OR (publish_at <= now()))))));

alter policy "daily_completions_owner_read" on public.daily_challenge_completions using (((user_id = auth.uid()) OR public.has_platform_permission('admin.daily')));

alter policy "competition_notification_deliveries_admin_only" on public.competition_notification_deliveries using ((platform_access_allowed() AND public.has_platform_permission('admin.competitions'))) with check ((platform_access_allowed() AND public.has_platform_permission('admin.competitions')));

alter policy "achievements_admin_manage" on public.achievements using (public.has_platform_permission('admin.badges')) with check (public.has_platform_permission('admin.badges'));

alter policy "achievements_public_read" on public.achievements using ((active OR public.has_platform_permission('admin.badges')));

alter policy "admins manage learning units" on public.learning_units using (public.has_platform_permission('admin.lessons')) with check (public.has_platform_permission('admin.lessons'));

alter policy "read published learning units" on public.learning_units using ((((is_published = true) AND (EXISTS ( SELECT 1
   FROM learning_paths p
  WHERE ((p.id = learning_units.path_id) AND (p.is_published = true))))) OR public.has_platform_permission('admin.lessons')));

alter policy "reward_products_admin_manage" on public.reward_products using (public.has_platform_permission('admin.shop')) with check (public.has_platform_permission('admin.shop'));

alter policy "reward_products_public_read" on public.reward_products using ((active OR public.has_platform_permission('admin.shop')));

alter policy "reward_inventory_admin_read" on public.user_reward_inventory using (public.has_platform_permission('admin.shop'));

alter policy "reward_transactions_admin_read" on public.reward_transactions using (public.has_platform_permission('admin.shop'));

alter policy "reward_point_awards_admin_read" on public.reward_point_awards using (public.has_platform_permission('admin.shop'));

alter policy "posts_self_delete" on public.posts using (((user_id = auth.uid()) OR public.has_platform_permission('admin.moderation')));

alter policy "comments_self_delete" on public.comments using (((user_id = auth.uid()) OR public.has_platform_permission('admin.moderation')));

alter policy "contact_messages_admin_delete" on public.contact_messages using (public.has_platform_permission('admin.contact'));

alter policy "contact_messages_admin_read" on public.contact_messages using (public.has_platform_permission('admin.contact'));

alter policy "contact_messages_admin_update" on public.contact_messages using (public.has_platform_permission('admin.contact')) with check (public.has_platform_permission('admin.contact'));

alter policy "badge_icons_admin_delete" on storage.objects using (((bucket_id = 'badge-icons'::text) AND public.has_platform_permission('admin.badges')));

alter policy "badge_icons_admin_insert" on storage.objects with check (((bucket_id = 'badge-icons'::text) AND public.has_platform_permission('admin.badges')));

alter policy "badge_icons_admin_update" on storage.objects using (((bucket_id = 'badge-icons'::text) AND public.has_platform_permission('admin.badges'))) with check (((bucket_id = 'badge-icons'::text) AND public.has_platform_permission('admin.badges')));

alter policy "posts_owner_delete" on storage.objects using (((bucket_id = 'posts'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR public.has_platform_permission('admin.moderation'))));

alter policy "reward_assets_admin_delete" on storage.objects using (((bucket_id = 'reward-assets'::text) AND public.has_platform_permission('admin.shop')));

alter policy "reward_assets_admin_insert" on storage.objects with check (((bucket_id = 'reward-assets'::text) AND public.has_platform_permission('admin.shop')));

alter policy "reward_assets_admin_update" on storage.objects using (((bucket_id = 'reward-assets'::text) AND public.has_platform_permission('admin.shop'))) with check (((bucket_id = 'reward-assets'::text) AND public.has_platform_permission('admin.shop')));

alter policy "content_reports_admin_update" on public.content_reports using (public.has_platform_permission('admin.moderation')) with check (public.has_platform_permission('admin.moderation'));

alter policy "content_reports_read_own" on public.content_reports using (((reporter_id = auth.uid()) OR public.has_platform_permission('admin.moderation')));

alter policy "admin_moderation_log_admin_read" on public.admin_moderation_log using (public.has_platform_permission('admin.moderation'));

alter policy "system_job_runs_admin_read" on public.system_job_runs using (public.has_platform_permission('admin.analytics'));

alter policy "workshops_admin_all" on public.workshops using (public.has_platform_permission('admin.workshops')) with check (public.has_platform_permission('admin.workshops'));

alter policy "workshop_resources_admin_all" on public.workshop_resources using (public.has_platform_permission('admin.workshops')) with check (public.has_platform_permission('admin.workshops'));

alter policy "workshop_sections_admin_all" on public.workshop_sections using (public.has_platform_permission('admin.workshops')) with check (public.has_platform_permission('admin.workshops'));

alter policy "workshop_section_resources_admin_all" on public.workshop_section_resources using (public.has_platform_permission('admin.workshops')) with check (public.has_platform_permission('admin.workshops'));

alter policy "workshop_comments_admin_all" on public.workshop_comments using (public.has_platform_permission('admin.workshops')) with check (public.has_platform_permission('admin.workshops'));

CREATE OR REPLACE FUNCTION public.admin_delete_reward_product(p_product_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_category text;
  v_has_history boolean;
begin
  if not public.has_platform_permission('admin.shop') then
    raise exception using message = 'admin_required';
  end if;

  select category into v_category
  from public.reward_products
  where id = p_product_id;

  if not found then
    raise exception using message = 'reward_not_found';
  end if;

  select exists (
    select 1
    from public.user_reward_inventory
    where product_id = p_product_id
  ) or exists (
    select 1
    from public.reward_transactions
    where product_id = p_product_id
  ) into v_has_history;

  if v_has_history then
    update public.reward_products
    set active = false,
        updated_at = now()
    where id = p_product_id;

    return jsonb_build_object('deleted', false, 'archived', true);
  end if;

  update public.profiles profile
  set equipped_rewards = profile.equipped_rewards - v_category
  where public.reward_value_id(profile.equipped_rewards -> v_category) = p_product_id;

  delete from public.reward_products
  where id = p_product_id;

  return jsonb_build_object('deleted', true, 'archived', false);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.has_platform_permission('admin.classes') or exists (
    select 1 from public.classes
    where id = p_class_id and teacher_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_live_room_owner(p_room_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.has_platform_permission('admin.live') or exists (
    select 1 from public.live_rooms
    where id = p_room_id and owner_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_study_group(p_group_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.has_platform_permission('admin.groups') or exists (
    select 1 from public.study_groups
    where id = p_group_id and owner_id = auth.uid()
  ) or exists (
    select 1 from public.study_group_members
    where group_id = p_group_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.admin_problem_stats(window_days integer DEFAULT 30, limit_count integer DEFAULT 10)
 RETURNS TABLE(problem_id uuid, code integer, title_i18n jsonb, difficulty text, attempts bigint, solvers bigint, learners bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    p.id,
    p.code::int,
    p.title_i18n::jsonb,
    p.difficulty::text,
    count(s.id),
    count(distinct s.user_id) filter (where s.score = 100),
    count(distinct s.user_id)
  from public.problems p
  join public.submissions s on s.problem_id = p.id
  where public.has_platform_permission('admin.analytics')
    and s.created_at >=
        timezone('utc', now()) - make_interval(days => greatest(window_days, 1))
  group by p.id, p.code, p.title_i18n, p.difficulty
  order by count(s.id) desc
  limit greatest(limit_count, 1);
$function$
;

CREATE OR REPLACE FUNCTION public.admin_activity_daily(window_days integer DEFAULT 30)
 RETURNS TABLE(day date, submissions bigint, active_users bigint, solves bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    span.day,
    count(s.id),
    count(distinct s.user_id),
    count(distinct (s.user_id, s.problem_id)) filter (where s.score = 100)
  from (
    select generate_series(
      timezone('utc', now())::date - (greatest(window_days, 1) - 1),
      timezone('utc', now())::date,
      interval '1 day'
    )::date as day
  ) span
  left join public.submissions s
    on s.created_at >= span.day::timestamp
   and s.created_at < (span.day + 1)::timestamp
  where public.has_platform_permission('admin.analytics')
  group by span.day
  order by span.day;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_achievement(p_badge_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.has_platform_permission('admin.badges') then
    raise exception using message = 'admin_required';
  end if;

  delete from public.user_achievements where achievement_id::text = p_badge_id;
  delete from public.achievements where id::text = p_badge_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_competition_leaderboard(p_competition_id uuid)
 RETURNS TABLE(rank_position bigint, user_id uuid, username text, avatar_url text, total_points bigint, solved_count bigint, last_submission_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  competition_row public.competitions%rowtype;
begin
  select * into competition_row
  from public.competitions
  where id = p_competition_id;

  if competition_row.id is null then
    raise exception 'Competition not found' using errcode = '22023';
  end if;

  if not public.platform_access_allowed() then
    raise exception 'Platform is locked' using errcode = '42501';
  end if;

  if not public.has_platform_permission('admin.competitions')
    and not (
      competition_row.status = 'published'
      and (
        competition_row.visibility = 'public'
        or exists (
          select 1 from public.competition_participants participant
          where participant.competition_id = p_competition_id
            and participant.user_id = auth.uid()
            and participant.status = 'active'
        )
      )
      and (
        competition_row.show_live_leaderboard
        or now() >= competition_row.ends_at
      )
    ) then
    raise exception 'Leaderboard is not available' using errcode = '42501';
  end if;

  return query
  with best as (
    select distinct on (submission.user_id, submission.competition_problem_id)
      submission.user_id,
      submission.competition_problem_id,
      submission.points,
      submission.score,
      submission.submitted_at
    from public.competition_submissions submission
    where submission.competition_id = p_competition_id
    order by
      submission.user_id,
      submission.competition_problem_id,
      submission.points desc,
      submission.submitted_at asc
  ), totals as (
    select
      participant.user_id,
      coalesce(sum(best.points), 0)::bigint as total_points,
      count(*) filter (where best.score = 100)::bigint as solved_count,
      max(best.submitted_at) as last_submission_at
    from public.competition_participants participant
    left join best on best.user_id = participant.user_id
    where participant.competition_id = p_competition_id
      and participant.status = 'active'
    group by participant.user_id
  )
  select
    rank() over (
      order by totals.total_points desc, totals.last_submission_at asc nulls last
    ) as rank_position,
    totals.user_id,
    coalesce(profile.username, 'participant')::text as username,
    profile.avatar_url::text,
    totals.total_points,
    totals.solved_count,
    totals.last_submission_at
  from totals
  left join public.profiles profile on profile.id = totals.user_id
  order by 1, 3;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_class_secure(p_name text)
 RETURNS classes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if not public.has_platform_permission('admin.classes') and not exists (
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
$function$
;

CREATE OR REPLACE FUNCTION public.admin_birthday_age_statistics()
 RETURNS TABLE(age_group text, total bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if not public.has_platform_permission('admin.analytics') then
    raise exception 'administrator_access_required' using errcode = '42501';
  end if;

  return query
  with ages as (
    select extract(year from age(current_date, private.birth_date))::integer as years
    from public.private_profile_data as private
  )
  select
    case
      when ages.years < 10 then 'under_10'
      when ages.years between 10 and 12 then '10_12'
      when ages.years between 13 and 15 then '13_15'
      when ages.years between 16 and 17 then '16_17'
      else '18_plus'
    end as age_group,
    count(*)::bigint as total
  from ages
  group by 1
  order by min(ages.years);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.duplicate_workshop(p_workshop_id uuid, p_title text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_new_id uuid;
  v_new_section_id uuid;
  v_new_resource_id uuid;
  v_resource_map jsonb := '{}'::jsonb;
  v_row record;
begin
  if not public.has_platform_permission('admin.workshops') then
    raise exception 'Only administrators can duplicate workshops'
      using errcode = '42501';
  end if;

  insert into public.workshops
    (title, summary, status, starts_at, location, audience, trainers, created_by)
  select
    coalesce(nullif(trim(p_title), ''), left(source.title || ' (copy)', 160)),
    source.summary,
    'draft',
    source.starts_at,
    source.location,
    source.audience,
    source.trainers,
    auth.uid()
  from public.workshops as source
  where source.id = p_workshop_id
  returning id into v_new_id;

  if v_new_id is null then
    raise exception 'Workshop % was not found', p_workshop_id
      using errcode = 'no_data_found';
  end if;

  for v_row in
    select * from public.workshop_resources
    where workshop_id = p_workshop_id
    order by sort_order, created_at
  loop
    insert into public.workshop_resources
      (workshop_id, kind, title, url, note, sort_order)
    values
      (v_new_id, v_row.kind, v_row.title, v_row.url, v_row.note, v_row.sort_order)
    returning id into v_new_resource_id;

    v_resource_map := v_resource_map
      || jsonb_build_object(v_row.id::text, v_new_resource_id::text);
  end loop;

  for v_row in
    select * from public.workshop_sections
    where workshop_id = p_workshop_id
    order by sort_order, created_at
  loop
    insert into public.workshop_sections
      (workshop_id, title, kind, duration_minutes, led_by, notes, done, sort_order)
    values
      (v_new_id, v_row.title, v_row.kind, v_row.duration_minutes, v_row.led_by,
       v_row.notes, false, v_row.sort_order)
    returning id into v_new_section_id;

    insert into public.workshop_section_resources (section_id, resource_id)
    select v_new_section_id, (v_resource_map ->> link.resource_id::text)::uuid
    from public.workshop_section_resources as link
    where link.section_id = v_row.id
      and v_resource_map ? link.resource_id::text;
  end loop;

  return v_new_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.move_workshop_section(p_section_id uuid, p_direction text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_workshop_id uuid;
  v_section public.workshop_sections;
  v_neighbour public.workshop_sections;
begin
  if not public.has_platform_permission('admin.workshops') then
    raise exception 'Only administrators can reorder workshop sections'
      using errcode = '42501';
  end if;

  if p_direction not in ('up', 'down') then
    raise exception 'Direction must be up or down' using errcode = '22023';
  end if;

  select workshop_id into v_workshop_id
  from public.workshop_sections
  where id = p_section_id;

  if not found then
    raise exception 'Section % was not found', p_section_id
      using errcode = 'no_data_found';
  end if;

  perform 1 from public.workshop_sections
  where workshop_id = v_workshop_id
  for update;

  with ordered as (
    select
      id,
      (row_number() over (order by sort_order, created_at)) * 10 as next_order
    from public.workshop_sections
    where workshop_id = v_workshop_id
  )
  update public.workshop_sections as target
  set sort_order = ordered.next_order
  from ordered
  where target.id = ordered.id
    and target.sort_order is distinct from ordered.next_order;

  select * into v_section
  from public.workshop_sections
  where id = p_section_id;

  if p_direction = 'up' then
    select * into v_neighbour
    from public.workshop_sections
    where workshop_id = v_workshop_id and sort_order < v_section.sort_order
    order by sort_order desc
    limit 1;
  else
    select * into v_neighbour
    from public.workshop_sections
    where workshop_id = v_workshop_id and sort_order > v_section.sort_order
    order by sort_order
    limit 1;
  end if;

  if not found then
    return;
  end if;

  update public.workshop_sections
  set sort_order = v_neighbour.sort_order
  where id = v_section.id;

  update public.workshop_sections
  set sort_order = v_section.sort_order
  where id = v_neighbour.id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.class_member_role(p_class_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when (public.scripticx_is_admin(p_user_id) or (p_user_id = auth.uid() and public.has_platform_permission('admin.classes'))) then 'admin'
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
$function$
;

notify pgrst, 'reload schema';
commit;
