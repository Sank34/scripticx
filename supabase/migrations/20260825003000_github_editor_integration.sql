-- GitHub App installations are deliberately accessed through authenticated
-- Next.js route handlers. Short-lived GitHub installation tokens are never
-- stored in the database.

create table if not exists public.github_install_states (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists github_install_states_user_idx
  on public.github_install_states(user_id, expires_at desc);

create table if not exists public.github_installations (
  installation_id bigint primary key,
  account_id bigint,
  account_login text not null,
  account_type text not null default 'User',
  repository_selection text not null default 'selected',
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.github_installation_users (
  installation_id bigint not null
    references public.github_installations(installation_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (installation_id, user_id)
);

create index if not exists github_installation_users_user_idx
  on public.github_installation_users(user_id, created_at desc);

create table if not exists public.github_project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.snippets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id bigint not null
    references public.github_installations(installation_id) on delete cascade,
  repository_id bigint not null,
  owner text not null,
  repo text not null,
  default_branch text not null,
  current_branch text not null,
  head_sha text,
  remote_head_sha text,
  sync_status text not null default 'unknown'
    check (sync_status in ('clean', 'behind', 'conflict', 'unknown')),
  tracked_paths text[] not null default '{}',
  file_hashes jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id),
  unique (user_id, repository_id, project_id)
);

create index if not exists github_project_links_installation_repo_idx
  on public.github_project_links(installation_id, owner, repo, current_branch);
create index if not exists github_project_links_user_idx
  on public.github_project_links(user_id, updated_at desc);

create table if not exists public.github_webhook_deliveries (
  delivery_id text primary key,
  event_name text not null,
  received_at timestamptz not null default now()
);

drop trigger if exists github_installations_set_updated_at
  on public.github_installations;
create trigger github_installations_set_updated_at
before update on public.github_installations
for each row execute function public.scripticx_set_updated_at();

drop trigger if exists github_project_links_set_updated_at
  on public.github_project_links;
create trigger github_project_links_set_updated_at
before update on public.github_project_links
for each row execute function public.scripticx_set_updated_at();

alter table public.github_install_states enable row level security;
alter table public.github_installations enable row level security;
alter table public.github_installation_users enable row level security;
alter table public.github_project_links enable row level security;
alter table public.github_webhook_deliveries enable row level security;

revoke all on table public.github_install_states from anon, authenticated;
revoke all on table public.github_installations from anon, authenticated;
revoke all on table public.github_installation_users from anon, authenticated;
revoke all on table public.github_project_links from anon, authenticated;
revoke all on table public.github_webhook_deliveries from anon, authenticated;

