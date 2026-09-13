begin;

create table if not exists public.user_language_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null check (locale in ('en', 'ro')),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_language_preferences is
  'Authoritative, revisioned UI language preference shared by ScripticX clients.';

insert into public.user_language_preferences (user_id, locale)
select
  account.id,
  case
    when account.raw_user_meta_data ->> 'scripticx_default_language' in ('en', 'ro')
      then account.raw_user_meta_data ->> 'scripticx_default_language'
    else account.raw_user_meta_data ->> 'locale'
  end
from auth.users as account
where account.raw_user_meta_data ->> 'scripticx_default_language' in ('en', 'ro')
  or account.raw_user_meta_data ->> 'locale' in ('en', 'ro')
on conflict (user_id) do nothing;

update public.email_preferences as email
set locale = preference.locale, updated_at = now()
from public.user_language_preferences as preference
where email.user_id = preference.user_id
  and email.locale is distinct from preference.locale;

alter table public.user_language_preferences enable row level security;

-- Language changes go through the authenticated API and the CAS function
-- below. Clients cannot bypass revision checks with a direct table write.
revoke all on public.user_language_preferences from public, anon, authenticated;
grant all on public.user_language_preferences to service_role;

create or replace function public.set_user_language_preference(
  p_user_id uuid,
  p_locale text,
  p_expected_revision bigint
)
returns table (
  applied boolean,
  locale text,
  revision bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_applied boolean := false;
  v_preference public.user_language_preferences%rowtype;
begin
  if p_user_id is null then
    raise exception 'User is required' using errcode = '22023';
  end if;
  if p_locale not in ('en', 'ro') then
    raise exception 'Invalid language' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid language revision' using errcode = '22023';
  end if;

  if p_expected_revision = 0 then
    insert into public.user_language_preferences (user_id, locale)
    values (p_user_id, p_locale)
    on conflict (user_id) do nothing
    returning * into v_preference;
    v_applied := found;
  else
    update public.user_language_preferences as preference
    set
      locale = p_locale,
      revision = preference.revision + 1,
      updated_at = now()
    where preference.user_id = p_user_id
      and preference.revision = p_expected_revision
    returning preference.* into v_preference;
    v_applied := found;
  end if;

  if v_applied then
    -- Patch auth metadata inside the same database transaction. JSONB
    -- concatenation reads the current row at update time, so unrelated
    -- onboarding/profile metadata cannot be replaced by a stale snapshot.
    update auth.users as account
    set raw_user_meta_data = coalesce(account.raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'locale', p_locale,
        'scripticx_default_language', p_locale,
        'scripticx_language_updated_at',
          floor(extract(epoch from v_preference.updated_at) * 1000)::bigint
      )
    where account.id = p_user_id;

    insert into public.email_preferences (user_id, locale)
    values (p_user_id, p_locale)
    on conflict (user_id) do update
    set locale = excluded.locale, updated_at = now();
  else
    select preference.*
    into v_preference
    from public.user_language_preferences as preference
    where preference.user_id = p_user_id;
  end if;

  return query
  select
    v_applied,
    v_preference.locale,
    coalesce(v_preference.revision, 0),
    v_preference.updated_at;
end;
$$;

revoke all on function public.set_user_language_preference(uuid, text, bigint)
  from public, anon, authenticated;
grant execute on function public.set_user_language_preference(uuid, text, bigint)
  to service_role;

commit;
