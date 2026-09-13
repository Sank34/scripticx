-- Hot read paths used by the persistent application shell, dashboard and groups.
-- All statements are idempotent so this migration is safe for databases where
-- an equivalent index was created manually before migrations were consolidated.

create index if not exists submissions_user_created_idx
  on public.submissions (user_id, created_at desc);

create index if not exists submissions_user_problem_score_idx
  on public.submissions (user_id, problem_id, score desc);

create index if not exists follows_follower_following_idx
  on public.follows (follower_id, following_id);

create index if not exists profiles_total_score_idx
  on public.profiles (total_score desc);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists study_group_members_user_status_idx
  on public.study_group_members (user_id, status, group_id);

create index if not exists study_group_messages_group_created_idx
  on public.study_group_messages (group_id, created_at desc);

create index if not exists study_group_messages_channel_created_idx
  on public.study_group_messages (channel_id, created_at desc);

create index if not exists daily_challenge_completions_user_challenge_idx
  on public.daily_challenge_completions (user_id, challenge_id);
