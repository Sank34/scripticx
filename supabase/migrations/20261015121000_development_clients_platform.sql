begin;

do $$
declare constraint_name text;
begin
  select conname into constraint_name from pg_constraint
  where conrelid = 'public.platform_roles'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%admin.certificates%';
  if constraint_name is not null then
    execute format('alter table public.platform_roles drop constraint %I', constraint_name);
  end if;

  select conname into constraint_name from pg_constraint
  where conrelid = 'public.email_outbox'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%product_updates%';
  if constraint_name is not null then
    execute format('alter table public.email_outbox drop constraint %I', constraint_name);
  end if;
end
$$;

alter table public.platform_roles add constraint platform_roles_permissions_check check (permissions <@ array['admin.classes','admin.live','admin.groups','admin.analytics','admin.tasks','admin.users','admin.problems','admin.competitions','admin.lessons','admin.workshops','admin.shop','admin.badges','admin.updates','admin.announcements','admin.contact','admin.email','admin.design-system','admin.moderation','admin.platform','admin.daily','admin.certificates','admin.clients','maintenance.bypass','competition.bypass']::text[] and array_position(permissions, null) is null);

alter table public.email_outbox add constraint email_outbox_category_check
  check (category in ('newsletter', 'product_updates', 'assignments', 'competitions', 'social', 'security', 'contact', 'client_updates'));

create or replace function public.platform_user_permissions(p_user_id uuid default auth.uid()) returns text[]
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare result text[];
begin
  if auth.role() is distinct from 'service_role' and (auth.uid() is null or p_user_id is distinct from auth.uid()) then
    raise exception 'Cannot read another account permissions' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=p_user_id and not coalesce(banned,false)) then return '{}'; end if;
  if exists(select 1 from public.profiles where id=p_user_id and role='admin') then return array['admin.classes','admin.live','admin.groups','admin.analytics','admin.tasks','admin.users','admin.problems','admin.competitions','admin.lessons','admin.workshops','admin.shop','admin.badges','admin.updates','admin.announcements','admin.contact','admin.email','admin.design-system','admin.moderation','admin.platform','admin.daily','admin.certificates','admin.clients','maintenance.bypass','competition.bypass']::text[]; end if;
  select coalesce(array_agg(distinct permission), '{}'::text[]) into result
  from public.platform_user_roles ur join public.platform_roles r on r.id=ur.role_id
  cross join lateral unnest(r.permissions) permission where ur.user_id=p_user_id;
  return result;
end;
$$;

create or replace function public.get_email_recipient(
  p_user_id uuid,
  p_category text
)
returns table (
  user_id uuid,
  email text,
  locale text,
  first_name text,
  username text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    account.id,
    lower(account.email),
    case
      when preference.locale = 'ro' then 'ro'
      when account.raw_user_meta_data ->> 'locale' = 'ro' then 'ro'
      else 'en'
    end,
    split_part(
      coalesce(
        nullif(account.raw_user_meta_data ->> 'full_name', ''),
        nullif(account.raw_user_meta_data ->> 'name', ''),
        nullif(profile.username, ''),
        split_part(account.email, '@', 1)
      ),
      ' ',
      1
    ),
    coalesce(nullif(profile.username, ''), split_part(account.email, '@', 1))
  from auth.users as account
  left join public.email_preferences as preference on preference.user_id = account.id
  left join public.profiles as profile on profile.id = account.id
  where account.id = p_user_id
    and account.email is not null
    and account.email_confirmed_at is not null
    and (
      p_category = 'security'
      or (p_category = 'contact' and profile.role = 'admin')
      or (p_category = 'assignments' and coalesce(preference.assignments, true))
      or (p_category = 'competitions' and coalesce(preference.competitions, true))
      or (p_category = 'social' and coalesce(preference.social, false))
      or (
        p_category = 'product_updates'
        and coalesce(preference.product_updates, false)
        and preference.marketing_consent_at is not null
      )
      or (
        p_category = 'newsletter'
        and coalesce(preference.newsletter, false)
        and preference.marketing_consent_at is not null
      )
      or (
        p_category = 'client_updates'
        and exists (
          select 1 from public.client_members as member
          where member.user_id = account.id and member.email_updates
        )
      )
    );
$$;

commit;
