-- Private birthday data and an idempotent annual birthday surprise.
-- Exact birth dates never live in public.profiles and are not exposed to other
-- users or to the public profile API.

begin;

create table if not exists public.private_profile_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date not null,
  time_zone text not null default 'Europe/Bucharest',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_profile_data_birth_date_check
    check (birth_date >= date '1900-01-01')
);

comment on table public.private_profile_data is
  'Private account attributes used for aggregate internal statistics and birthday experiences.';
comment on column public.private_profile_data.birth_date is
  'Private birth date. It must never be joined into public profile responses.';

alter table public.private_profile_data enable row level security;
alter table public.private_profile_data force row level security;

revoke all on public.private_profile_data from public, anon, authenticated;
grant select on public.private_profile_data to authenticated;
grant all on public.private_profile_data to service_role;

drop policy if exists "private_profile_data_select_own"
  on public.private_profile_data;
create policy "private_profile_data_select_own"
  on public.private_profile_data
  for select
  to authenticated
  using (user_id = auth.uid());

create table if not exists public.birthday_reward_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_year integer not null check (claim_year >= 2026),
  claimed_at timestamptz not null default now(),
  primary key (user_id, claim_year)
);

comment on table public.birthday_reward_claims is
  'Server-owned annual claim ledger that prevents duplicate birthday celebrations and grants.';

alter table public.birthday_reward_claims enable row level security;
alter table public.birthday_reward_claims force row level security;

revoke all on public.birthday_reward_claims from public, anon, authenticated;
grant select on public.birthday_reward_claims to authenticated;
grant all on public.birthday_reward_claims to service_role;

drop policy if exists "birthday_reward_claims_select_own"
  on public.birthday_reward_claims;
create policy "birthday_reward_claims_select_own"
  on public.birthday_reward_claims
  for select
  to authenticated
  using (user_id = auth.uid());

insert into public.reward_products (
  id,
  category,
  name_i18n,
  description_i18n,
  price,
  rarity,
  visual,
  active,
  sort_order,
  style_config
)
values
  (
    'birthday-party-decoration',
    'avatar-decoration',
    '{"en":"Birthday party!","ro":"Petrecere aniversară!"}'::jsonb,
    '{"en":"A party hat and confetti made just for your birthday.","ro":"Un coif de petrecere și confetti create special pentru ziua ta."}'::jsonb,
    500,
    'legendary',
    'birthday-party',
    false,
    900,
    '{}'::jsonb
  ),
  (
    'birthday-confetti-background',
    'profile-background',
    '{"en":"Birthday confetti","ro":"Confetti aniversar"}'::jsonb,
    '{"en":"A cheerful birthday pattern for your profile.","ro":"Un pattern aniversar vesel pentru profilul tău."}'::jsonb,
    500,
    'legendary',
    'birthday-confetti',
    false,
    901,
    '{"backgroundColor":"#fffdf8","patternOpacity":0.72,"patternSize":88}'::jsonb
  )
on conflict (id) do nothing;

create or replace function public.set_private_birth_date(
  p_birth_date date,
  p_time_zone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_account_id uuid := auth.uid();
  v_time_zone text;
  v_today date;
begin
  if v_account_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select zone.name
  into v_time_zone
  from pg_catalog.pg_timezone_names as zone
  where zone.name = coalesce(nullif(trim(p_time_zone), ''), 'Europe/Bucharest')
  limit 1;

  if v_time_zone is null then
    v_time_zone := 'Europe/Bucharest';
  end if;

  v_today := (now() at time zone v_time_zone)::date;
  if p_birth_date is null
    or p_birth_date < date '1900-01-01'
    or p_birth_date > v_today
  then
    raise exception 'invalid_birth_date' using errcode = '22023';
  end if;

  insert into public.private_profile_data (
    user_id,
    birth_date,
    time_zone,
    updated_at
  )
  values (
    v_account_id,
    p_birth_date,
    v_time_zone,
    now()
  )
  on conflict (user_id) do update
  set
    time_zone = excluded.time_zone,
    updated_at = now()
  where public.private_profile_data.birth_date = excluded.birth_date;

  if not found then
    raise exception 'birth_date_already_set' using errcode = '23505';
  end if;

  -- Registration needs a temporary private metadata bridge before email
  -- verification. Remove it as soon as the authoritative private row exists.
  update auth.users as account
  set raw_user_meta_data =
    coalesce(account.raw_user_meta_data, '{}'::jsonb)
      - 'scripticx_registration_birth_date'
  where account.id = v_account_id;

  return jsonb_build_object(
    'saved', true,
    'timeZone', v_time_zone
  );
end;
$$;

revoke all on function public.set_private_birth_date(date, text)
  from public, anon, authenticated;
grant execute on function public.set_private_birth_date(date, text)
  to authenticated;

create or replace function public.claim_birthday_surprise()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_account_id uuid := auth.uid();
  v_private public.private_profile_data%rowtype;
  v_today date;
  v_year integer;
  v_is_leap_year boolean;
  v_is_birthday boolean;
  v_claimed boolean := false;
  v_product_ids text[] := array[
    'birthday-party-decoration',
    'birthday-confetti-background'
  ]::text[];
begin
  if v_account_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select private.*
  into v_private
  from public.private_profile_data as private
  where private.user_id = v_account_id;

  if not found then
    return jsonb_build_object(
      'status', 'missing_birth_date',
      'claimed', false,
      'claimYear', null,
      'productIds', '[]'::jsonb
    );
  end if;

  v_today := (now() at time zone v_private.time_zone)::date;
  v_year := extract(year from v_today)::integer;
  v_is_leap_year := extract(
    day from (make_date(v_year, 3, 1) - interval '1 day')
  )::integer = 29;
  v_is_birthday := (
    extract(month from v_private.birth_date) = extract(month from v_today)
    and extract(day from v_private.birth_date) = extract(day from v_today)
  ) or (
    extract(month from v_private.birth_date) = 2
    and extract(day from v_private.birth_date) = 29
    and not v_is_leap_year
    and extract(month from v_today) = 2
    and extract(day from v_today) = 28
  );

  if not v_is_birthday then
    return jsonb_build_object(
      'status', 'not_birthday',
      'claimed', false,
      'claimYear', v_year,
      'productIds', '[]'::jsonb
    );
  end if;

  insert into public.birthday_reward_claims (user_id, claim_year)
  values (v_account_id, v_year)
  on conflict (user_id, claim_year) do nothing
  returning true into v_claimed;

  if not coalesce(v_claimed, false) then
    return jsonb_build_object(
      'status', 'already_claimed',
      'claimed', false,
      'claimYear', v_year,
      'productIds', to_jsonb(v_product_ids)
    );
  end if;

  insert into public.user_reward_inventory (
    user_id,
    product_id,
    acquired_at,
    equipped_at
  )
  select
    v_account_id,
    product.id,
    now(),
    null
  from public.reward_products as product
  where product.id = any(v_product_ids)
  on conflict (user_id, product_id) do nothing;

  insert into public.notifications (
    user_id,
    actor_id,
    type,
    title,
    body,
    href,
    metadata,
    dedupe_key
  )
  values (
    v_account_id,
    null,
    'birthday_surprise',
    'A birthday surprise is waiting!',
    'We left two special gifts in your Rewards Shop inventory.',
    '/shop?birthday=1',
    jsonb_build_object(
      'claimYear', v_year,
      'productIds', to_jsonb(v_product_ids)
    ),
    'birthday:' || v_account_id::text || ':' || v_year::text
  )
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'status', 'claimed',
    'claimed', true,
    'claimYear', v_year,
    'productIds', to_jsonb(v_product_ids)
  );
end;
$$;

revoke all on function public.claim_birthday_surprise()
  from public, anon, authenticated;
grant execute on function public.claim_birthday_surprise()
  to authenticated;

create or replace function public.admin_birthday_age_statistics()
returns table (
  age_group text,
  total bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.scripticx_is_admin(auth.uid()) then
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
$$;

revoke all on function public.admin_birthday_age_statistics()
  from public, anon, authenticated;
grant execute on function public.admin_birthday_age_statistics()
  to authenticated;

commit;
