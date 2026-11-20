create table public.repository_stars (
  repository_id uuid not null references public.snippets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (repository_id, user_id)
);

create index repository_stars_user_id_idx on public.repository_stars (user_id);

alter table public.repository_stars enable row level security;
revoke all on public.repository_stars from public, anon, authenticated;

create function public.get_repository_stars(p_repository_id uuid)
returns table (star_count bigint, starred boolean)
language sql stable security definer
set search_path = ''
as $$
  select count(star.user_id), coalesce(bool_or(star.user_id = auth.uid()), false)
  from public.snippets as repo
  left join public.repository_stars as star on star.repository_id = repo.id
  where repo.id = p_repository_id
    and (repo.is_public is true or repo.user_id = auth.uid())
  group by repo.id;
$$;

create function public.set_repository_star(p_repository_id uuid, p_starred boolean)
returns table (star_count bigint, starred boolean)
language plpgsql security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null or p_starred is null then
    raise exception 'Invalid star request' using errcode = '42501';
  end if;

  perform 1 from public.snippets as repo
  where repo.id = p_repository_id
    and (repo.is_public is true or repo.user_id = viewer_id)
  for share;

  if not found then
    raise exception 'Repository unavailable' using errcode = '42501';
  end if;

  if p_starred then
    insert into public.repository_stars (repository_id, user_id)
    values (p_repository_id, viewer_id)
    on conflict (repository_id, user_id) do nothing;
  else
    delete from public.repository_stars
    where repository_id = p_repository_id and user_id = viewer_id;
  end if;

  return query select * from public.get_repository_stars(p_repository_id);
end;
$$;

revoke all on function public.get_repository_stars(uuid) from public, anon, authenticated;
revoke all on function public.set_repository_star(uuid, boolean) from public, anon, authenticated;
grant execute on function public.get_repository_stars(uuid) to anon, authenticated;
grant execute on function public.set_repository_star(uuid, boolean) to authenticated;
