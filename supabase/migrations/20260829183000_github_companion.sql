-- Read-only GitHub Companion associations for teacher classes.
-- GitHub installation credentials remain server-only; this table only stores
-- the selected repository identity and branch.

begin;

create table if not exists public.github_class_links (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id bigint not null
    references public.github_installations(installation_id) on delete cascade,
  repository_id bigint not null,
  owner text not null,
  repo text not null,
  default_branch text not null,
  current_branch text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint github_class_links_class_repository_key
    unique (class_id, repository_id)
);

create index if not exists github_class_links_user_idx
  on public.github_class_links(user_id, updated_at desc);
create index if not exists github_class_links_class_idx
  on public.github_class_links(class_id, updated_at desc);
create index if not exists github_class_links_repository_idx
  on public.github_class_links(installation_id, owner, repo);

drop trigger if exists github_class_links_set_updated_at
  on public.github_class_links;
create trigger github_class_links_set_updated_at
before update on public.github_class_links
for each row execute function public.scripticx_set_updated_at();

alter table public.github_class_links enable row level security;
revoke all on table public.github_class_links from anon, authenticated;

commit;
