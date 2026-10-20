begin;

create or replace function public.award_submission_reward(
  p_submission_id text,
  p_completion_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_submission record;
  v_profile public.profiles%rowtype;
  v_challenge record;
  v_completion_id uuid;
  v_award_completion_id text;
  v_previous_best integer := 0;
  v_base_points integer := 0;
  v_bonus_points integer := 0;
  v_daily_completed boolean := false;
begin
  if v_user_id is null then
    raise exception using message = 'authentication_required';
  end if;

  -- Serialize claims for this account, including concurrent submissions.
  select profile.* into v_profile
  from public.profiles profile
  where profile.id = v_user_id
  for update;
  if not found then
    raise exception using message = 'profile_not_found';
  end if;

  select submission.id, submission.problem_id, submission.verified_at,
    least(greatest(coalesce(submission.score, 0), 0), 100)::integer as score
  into v_submission
  from public.submissions submission
  where submission.id::text = p_submission_id
    and submission.user_id = v_user_id
    and submission.verified_at is not null
    and submission.verification_source = 'server-v1';
  if not found then
    raise exception using message = 'submission_not_found';
  end if;

  if exists (
    select 1 from public.reward_point_awards award
    where award.user_id = v_user_id and award.submission_id = p_submission_id
  ) then
    return jsonb_build_object(
      'awarded', 0, 'base_points', 0, 'bonus_points', 0,
      'bonus_awarded', false, 'already_claimed', true,
      'daily_completed', exists (
        select 1 from public.daily_challenge_completions completion
        join public.daily_challenges challenge on challenge.id = completion.challenge_id
        where completion.user_id = v_user_id
          and completion.problem_id = v_submission.problem_id
          and challenge.challenge_date = (
            v_submission.verified_at at time zone 'Europe/Bucharest'
          )::date
      ),
      'total_score', v_profile.total_score, 'reward_points', v_profile.reward_points
    );
  end if;

  -- Count credited progress, not verified attempts whose reward failed.
  -- Pre-verification submissions retain their existing legacy progress.
  select coalesce(max(least(greatest(coalesce(previous.score, 0), 0), 100)), 0)::integer
  into v_previous_best
  from public.submissions previous
  where previous.user_id = v_user_id
    and previous.problem_id = v_submission.problem_id
    and previous.id <> v_submission.id
    and (
      exists (
        select 1 from public.reward_point_awards award
        where award.user_id = v_user_id and award.submission_id = previous.id::text
      )
      or (
        previous.verification_source is distinct from 'server-v1'
        and previous.created_at <= (
          v_submission.verified_at at time zone 'UTC'
        )
      )
    );
  v_base_points := greatest(v_submission.score - v_previous_best, 0);

  if v_submission.score = 100 then
    select challenge.id, challenge.bonus_points
    into v_challenge
    from public.daily_challenges challenge
    where challenge.problem_id = v_submission.problem_id
      and challenge.is_active
      and challenge.challenge_date = (
        v_submission.verified_at at time zone 'Europe/Bucharest'
      )::date
    for share;

    if found then
      insert into public.daily_challenge_completions (
        challenge_id, user_id, problem_id, bonus_points
      ) values (
        v_challenge.id, v_user_id, v_submission.problem_id,
        greatest(coalesce(v_challenge.bonus_points, 0), 0)
      )
      on conflict (challenge_id, user_id) do nothing;

      select completion.id into v_completion_id
      from public.daily_challenge_completions completion
      where completion.challenge_id = v_challenge.id
        and completion.user_id = v_user_id
        and completion.problem_id = v_submission.problem_id
      for update;
      if not found then
        raise exception using message = 'daily_completion_not_found';
      end if;
      v_daily_completed := true;

      if not exists (
        select 1 from public.reward_point_awards award
        where award.completion_id = v_completion_id::text
      ) then
        v_bonus_points := greatest(coalesce(v_challenge.bonus_points, 0), 0);
        v_award_completion_id := v_completion_id::text;
        update public.daily_challenge_completions
        set bonus_points = v_bonus_points
        where id = v_completion_id;
      end if;
    end if;
  end if;

  if p_completion_id is not null
    and p_completion_id is distinct from v_completion_id::text then
    raise exception using message = 'daily_completion_not_found';
  end if;

  insert into public.reward_point_awards (
    user_id, submission_id, completion_id, amount
  ) values (
    v_user_id, p_submission_id, v_award_completion_id, v_base_points + v_bonus_points
  );

  update public.profiles profile
  set total_score = coalesce(profile.total_score, 0) + v_base_points + v_bonus_points,
      reward_points = coalesce(profile.reward_points, 0) + v_base_points + v_bonus_points
  where profile.id = v_user_id
  returning profile.* into v_profile;

  return jsonb_build_object(
    'awarded', v_base_points + v_bonus_points,
    'base_points', v_base_points, 'bonus_points', v_bonus_points,
    'bonus_awarded', v_award_completion_id is not null,
    'daily_completed', v_daily_completed, 'already_claimed', false,
    'total_score', v_profile.total_score, 'reward_points', v_profile.reward_points
  );
end;
$$;

revoke all on function public.award_submission_reward(text, text) from public, anon;
grant execute on function public.award_submission_reward(text, text) to authenticated;

commit;
