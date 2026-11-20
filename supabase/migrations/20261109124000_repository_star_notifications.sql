create function public.notify_repository_star()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
  select
    repo.user_id,
    new.user_id,
    'repository_star',
    case when preference.locale = 'ro'
      then format('%s ți-a dat o stea la repozitoriu', coalesce(actor.username, 'Cineva'))
      else format('%s starred your repository', coalesce(actor.username, 'Someone'))
    end,
    nullif(btrim(repo.title), ''),
    format('/repos/%s', repo.id),
    jsonb_build_object('repositoryId', repo.id, 'username', actor.username),
    format('repository-star:%s:%s:%s', repo.id, new.user_id, repo.user_id)
  from public.snippets as repo
  left join public.profiles as actor on actor.id = new.user_id
  left join public.user_language_preferences as preference on preference.user_id = repo.user_id
  where repo.id = new.repository_id
    and repo.is_public is true
    and repo.user_id <> new.user_id
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

revoke all on function public.notify_repository_star() from public, anon, authenticated;

create trigger repository_stars_notify_owner
after insert on public.repository_stars
for each row execute function public.notify_repository_star();
