alter table public.posts enable row level security;

drop policy if exists "admins can delete posts" on public.posts;

create policy "admins can delete posts"
on public.posts
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
