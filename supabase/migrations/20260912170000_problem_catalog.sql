begin;

-- One ordered catalog is saved atomically; problem content and access stay in problems.
create table if not exists public.problem_catalog (
  id smallint primary key default 1 check (id = 1),
  chapters jsonb not null check (jsonb_typeof(chapters) = 'array' and octet_length(chapters::text) <= 1048576),
  updated_at timestamptz not null default now()
);

alter table public.problem_catalog enable row level security;
alter table public.problem_catalog force row level security;
grant select on public.problem_catalog to anon, authenticated;
grant insert, update on public.problem_catalog to authenticated;
grant all on public.problem_catalog to service_role;

drop policy if exists "problem_catalog_read" on public.problem_catalog;
create policy "problem_catalog_read" on public.problem_catalog for select
  to anon, authenticated using (true);
drop policy if exists "problem_catalog_admin_insert" on public.problem_catalog;
create policy "problem_catalog_admin_insert" on public.problem_catalog for insert
  to authenticated with check (public.scripticx_is_admin(auth.uid()));
drop policy if exists "problem_catalog_admin_update" on public.problem_catalog;
create policy "problem_catalog_admin_update" on public.problem_catalog for update
  to authenticated using (public.scripticx_is_admin(auth.uid()))
  with check (public.scripticx_is_admin(auth.uid()));

commit;
