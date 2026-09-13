-- Aggregate-only public profile activity contract.
--
-- This migration is intentionally separate from the local UI implementation.
-- Until it is applied, the frontend may keep using its current authorized-row
-- fallback and build the same dense date range client-side.

begin;
create or replace function public.get_profile_submission_activity(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  activity_date date,
  submission_count bigint,
  accepted_problem_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_user_id is null or p_start_date is null or p_end_date is null then
    raise exception 'User id and date range are required'
      using errcode = '22023';
  end if;

  if p_start_date > p_end_date then
    raise exception 'Start date must not be after end date'
      using errcode = '22023';
  end if;

  -- Inclusive boundaries: a difference of 399 represents 400 calendar days.
  if (p_end_date - p_start_date) > 399 then
    raise exception 'Date range cannot exceed 400 days'
      using errcode = '22023';
  end if;

  -- Preserve the same empty result for an unknown profile and a profile with
  -- no activity; the function never exposes profile or submission details.
  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_user_id
  ) then
    return;
  end if;

  return query
  select
    (submission.created_at at time zone 'UTC')::date as activity_date,
    count(*)::bigint as submission_count,
    count(distinct submission.problem_id) filter (
      where submission.score >= 100
    )::bigint as accepted_problem_count
  from public.submissions as submission
  where submission.user_id = p_user_id
    and submission.verified_at is not null
    and submission.created_at >= (
      p_start_date::timestamp without time zone at time zone 'UTC'
    )
    and submission.created_at < (
      (p_end_date + 1)::timestamp without time zone at time zone 'UTC'
    )
  group by 1
  order by 1;
end;
$$;
revoke all on function public.get_profile_submission_activity(uuid, date, date)
  from public;
grant execute on function public.get_profile_submission_activity(uuid, date, date)
  to anon, authenticated;
comment on function public.get_profile_submission_activity(uuid, date, date) is
  'Returns verified submission counts and distinct accepted problems per UTC day for an existing public profile, over at most 400 inclusive days. Exposes aggregates only.';
commit;
