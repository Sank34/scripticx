begin;

do $$
begin
  if to_regclass('public.competitions') is null then
    raise exception 'Required table public.competitions does not exist'
      using errcode = '42P01';
  end if;

  if to_regclass('public.competition_participants') is null then
    raise exception 'Required table public.competition_participants does not exist'
      using errcode = '42P01';
  end if;
end;
$$;

alter table public.competitions
  add column if not exists registration_ends_at timestamptz;

alter table public.competitions
  drop constraint if exists competitions_registration_ends_at_check;

alter table public.competitions
  add constraint competitions_registration_ends_at_check
  check (registration_ends_at is null or registration_ends_at <= ends_at);

comment on column public.competitions.registration_ends_at is
  'Optional exclusive upper bound for joining a competition; NULL falls back to ends_at.';

create or replace function public.enforce_competition_registration_deadline()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_competition_status text;
  v_registration_deadline timestamptz;
begin
  -- Service-role calls are used for trusted administrative maintenance.
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  -- Leaving a competition, or changing an already-inactive row, is unrestricted.
  if new.status is distinct from 'active' then
    return new;
  end if;

  -- Ordinary updates to an existing active membership stay valid. Moving that
  -- membership to another competition must pass the new competition's checks.
  if tg_op = 'UPDATE' then
    if old.status = 'active'
      and old.competition_id is not distinct from new.competition_id then
      return new;
    end if;
  end if;

  select
    competition.status,
    coalesce(competition.registration_ends_at, competition.ends_at)
  into
    v_competition_status,
    v_registration_deadline
  from public.competitions as competition
  where competition.id = new.competition_id
  for share;

  if not found then
    raise exception 'Competition does not exist'
      using errcode = '23503';
  end if;

  if v_competition_status is distinct from 'published'
    or v_registration_deadline is null
    or clock_timestamp() >= v_registration_deadline then
    raise exception 'Competition registration is closed'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_competition_registration_deadline()
  from public, anon, authenticated;

drop trigger if exists enforce_competition_registration_deadline
  on public.competition_participants;

create trigger enforce_competition_registration_deadline
before insert or update of competition_id, status
on public.competition_participants
for each row
execute function public.enforce_competition_registration_deadline();

commit;
