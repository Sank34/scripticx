create function public.get_feed_repositories(p_popular boolean default false)
returns table (
  id uuid,
  title text,
  description text,
  owner_username text,
  created_at timestamptz,
  star_count bigint,
  starred boolean
)
language sql stable security definer
set search_path = ''
as $$
  with candidates as (
    select repo.id
    from public.snippets as repo
    where repo.is_public is true and not repo.is_live_workspace
    order by repo.created_at desc, repo.id desc
    limit 12
  )
  select
    repo.id,
    repo.title,
    repo.description,
    owner.username,
    repo.created_at::timestamptz,
    count(star.user_id),
    coalesce(bool_or(star.user_id = (select auth.uid())), false)
  from public.snippets as repo
  left join public.profiles as owner on owner.id = repo.user_id
  left join public.repository_stars as star on star.repository_id = repo.id
  where repo.is_public is true and not repo.is_live_workspace
    and (p_popular or repo.id in (select candidates.id from candidates))
  group by repo.id, owner.username
  having not p_popular or count(star.user_id) > 0
  order by case when p_popular then count(star.user_id) end desc, repo.created_at desc, repo.id desc
  limit case when p_popular then 4 else 12 end;
$$;

revoke all on function public.get_feed_repositories(boolean) from public, anon;
grant execute on function public.get_feed_repositories(boolean) to authenticated;
