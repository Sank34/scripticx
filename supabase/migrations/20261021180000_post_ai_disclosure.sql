begin;

alter table public.posts
  add column if not exists is_ai_generated boolean not null default false;

comment on column public.posts.is_ai_generated is
  'Author-declared AI-generated or substantially AI-altered content. False means not declared, not verified human authorship.';

create or replace function public.set_post_ai_generated(
  p_post_id uuid,
  p_is_ai_generated boolean
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_is_ai_generated is null then
    raise exception 'AI disclosure must be a boolean' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and not coalesce(banned, false)
  ) then
    raise exception 'Account cannot update posts' using errcode = '42501';
  end if;

  -- Only this column is editable through the RPC, and only by the post's author.
  update public.posts
  set is_ai_generated = p_is_ai_generated
  where id = p_post_id and user_id = auth.uid();
  if not found then
    raise exception 'Post unavailable or not owned by you' using errcode = '42501';
  end if;
  return p_is_ai_generated;
end;
$$;

revoke all on function public.set_post_ai_generated(uuid, boolean) from public, anon;
grant execute on function public.set_post_ai_generated(uuid, boolean) to authenticated;

commit;
