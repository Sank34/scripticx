-- Keep the existing `snippets` table compatible while the product language
-- evolves to Projects. Project files and explicit empty directories are stored
-- together as a JSON array in `files`.

alter table public.snippets
  add column if not exists files jsonb;

update public.snippets
set files = '[]'::jsonb
where files is null;

alter table public.snippets
  alter column files set default '[]'::jsonb,
  alter column files set not null;

grant insert, update on table public.snippets to authenticated;

alter table public.snippets enable row level security;

drop policy if exists editor_projects_insert on public.snippets;
create policy editor_projects_insert
on public.snippets
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists editor_projects_update on public.snippets;
create policy editor_projects_update
on public.snippets
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
