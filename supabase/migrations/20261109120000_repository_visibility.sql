alter table public.snippets enable row level security;
grant select on public.snippets to anon, authenticated;

create policy repositories_read_visible
on public.snippets
for select
to anon, authenticated
using (is_public is true or user_id = (select auth.uid()));

-- Existing permissive policies cannot widen access to private repository rows.
create policy repositories_read_visibility_boundary
on public.snippets
as restrictive
for select
to anon, authenticated
using (is_public is true or user_id = (select auth.uid()));

create policy repositories_update_owner_boundary
on public.snippets
as restrictive
for update
to anon, authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create index if not exists snippets_owner_created_id_idx
on public.snippets (user_id, created_at desc, id desc);
