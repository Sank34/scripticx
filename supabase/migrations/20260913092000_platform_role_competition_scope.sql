begin;

create or replace function public.platform_access_allowed() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select not exists(select 1 from public.profiles where id=auth.uid() and coalesce(banned,false)) and (
    coalesce((select not lockdown_enabled from public.platform_settings where id='global'),true)
    or public.has_platform_permission('maintenance.bypass') and exists(select 1 from public.platform_settings where id='global' and lockdown_mode='maintenance')
    or exists(select 1 from public.platform_settings where id='global' and lockdown_mode='competition') and (
      public.has_platform_permission('competition.bypass')
      or not exists(select 1 from public.competition_participants where user_id=auth.uid() and status='active')
    )
  );
$$;

create function public.competition_access_allowed() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select not exists(select 1 from public.profiles where id=auth.uid() and coalesce(banned,false)) and (
    coalesce((select not lockdown_enabled or lockdown_mode='competition' from public.platform_settings where id='global'),true)
    or public.has_platform_permission('maintenance.bypass')
  );
$$;
revoke all on function public.competition_access_allowed() from public;
grant execute on function public.competition_access_allowed() to authenticated,anon,service_role;

do $$
declare policy record; definition text; command text;
begin
  for policy in select * from pg_policies where schemaname='public' and tablename in (
    'competitions','competition_invites','competition_invitees','competition_breaks','competition_problems','competition_participants','competition_submissions','competition_notification_deliveries'
  ) loop
    command := format('alter policy %I on public.%I',policy.policyname,policy.tablename);
    if policy.qual is not null then command := command || ' using (' || replace(policy.qual,'platform_access_allowed()','competition_access_allowed()') || ')'; end if;
    if policy.with_check is not null then command := command || ' with check (' || replace(policy.with_check,'platform_access_allowed()','competition_access_allowed()') || ')'; end if;
    execute command;
  end loop;
  for definition in select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('join_competition','get_competition_leaderboard') loop
    execute replace(definition,'public.platform_access_allowed()','public.competition_access_allowed()');
  end loop;
  select pg_get_functiondef('public.has_platform_permission(text)'::regprocedure) into definition;
  execute replace(definition, $old$settings.lockdown_mode = 'competition' and$old$, $new$settings.lockdown_mode = 'competition' and p_permission <> 'admin.competitions' and$new$);
end $$;

-- Identity remains readable while the rest of the platform is restricted.
alter policy platform_lockdown_guard on public.profiles
using (public.competition_access_allowed()) with check (public.platform_access_allowed());
notify pgrst, 'reload schema';
commit;
