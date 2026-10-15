begin;

do $$
begin
  if to_regprocedure('public.has_platform_permission(text)') is null then
    raise exception
      'public.has_platform_permission is missing. Apply 20260913090000_platform_roles.sql first.';
  end if;
end
$$;

create table public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  company text not null check (char_length(trim(company)) between 1 and 160),
  created_at timestamptz not null default now()
);

create table public.client_members (
  account_id uuid not null references public.client_accounts(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  email_updates boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create table public.client_projects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.client_accounts(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 5000),
  status text not null default 'În pregătire',
  phase text not null default 'Descoperire',
  due_date date,
  next_action text check (next_action is null or char_length(next_action) <= 500),
  created_at timestamptz not null default now()
);
create index client_projects_account_idx on public.client_projects(account_id);

create table public.client_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  title text not null,
  status text not null default 'upcoming' check (status in ('done', 'current', 'upcoming')),
  position integer not null default 0
);
create table public.client_project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'Proiect',
  created_at timestamptz not null default now()
);
create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  name text not null,
  category text not null default 'Document',
  size_label text not null default '',
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
create table public.client_invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  number text not null,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'RON' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  due_date date not null,
  checkout_url text check (checkout_url is null or checkout_url ~ '^https://'),
  created_at timestamptz not null default now()
);
create table public.client_meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  starts_at timestamptz not null,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'cancelled')),
  meeting_url text check (meeting_url is null or meeting_url ~ '^https://'),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

create index client_milestones_project_idx on public.client_milestones(project_id);
create index client_project_updates_project_idx on public.client_project_updates(project_id);
create index client_documents_project_idx on public.client_documents(project_id);
create index client_invoices_project_idx on public.client_invoices(project_id);
create index client_meetings_project_idx on public.client_meetings(project_id);

create function public.is_client_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_platform_permission('admin.clients');
$$;

create function public.is_client_member(p_account_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.client_members
    where account_id = p_account_id and user_id = (select auth.uid())
  );
$$;

create function public.can_access_client_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.client_projects p
    join public.client_members m on m.account_id = p.account_id
    where p.id = p_project_id and m.user_id = (select auth.uid())
  );
$$;

create function public.set_client_email_updates(p_enabled boolean)
returns boolean language sql volatile security definer set search_path = '' as $$
  update public.client_members set email_updates = p_enabled
  where user_id = (select auth.uid())
  returning email_updates;
$$;

revoke all on function public.is_client_staff() from public, anon;
revoke all on function public.is_client_member(uuid) from public, anon;
revoke all on function public.can_access_client_project(uuid) from public, anon;
revoke all on function public.set_client_email_updates(boolean) from public, anon;
grant execute on function public.is_client_staff() to authenticated;
grant execute on function public.is_client_member(uuid) to authenticated;
grant execute on function public.can_access_client_project(uuid) to authenticated;
grant execute on function public.set_client_email_updates(boolean) to authenticated;

alter table public.client_accounts enable row level security;
alter table public.client_members enable row level security;
alter table public.client_projects enable row level security;
alter table public.client_milestones enable row level security;
alter table public.client_project_updates enable row level security;
alter table public.client_documents enable row level security;
alter table public.client_invoices enable row level security;
alter table public.client_meetings enable row level security;

revoke all on public.client_accounts, public.client_members, public.client_projects,
  public.client_milestones, public.client_project_updates, public.client_documents,
  public.client_invoices, public.client_meetings from anon, authenticated;
grant select, insert, update, delete on public.client_accounts, public.client_members,
  public.client_projects, public.client_milestones, public.client_project_updates,
  public.client_documents, public.client_invoices, public.client_meetings to authenticated;
grant all on public.client_accounts, public.client_members, public.client_projects,
  public.client_milestones, public.client_project_updates, public.client_documents,
  public.client_invoices, public.client_meetings to service_role;

create policy client_accounts_read on public.client_accounts for select to authenticated
  using (public.is_client_member(id));
create policy client_members_read on public.client_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy client_projects_read on public.client_projects for select to authenticated
  using (public.is_client_member(account_id));
create policy client_milestones_read on public.client_milestones for select to authenticated
  using (public.can_access_client_project(project_id));
create policy client_project_updates_read on public.client_project_updates for select to authenticated
  using (public.can_access_client_project(project_id));
create policy client_documents_read on public.client_documents for select to authenticated
  using (public.can_access_client_project(project_id));
create policy client_invoices_read on public.client_invoices for select to authenticated
  using (public.can_access_client_project(project_id));
create policy client_meetings_read on public.client_meetings for select to authenticated
  using (public.can_access_client_project(project_id));
create policy client_meetings_request on public.client_meetings for insert to authenticated
  with check (
    public.can_access_client_project(project_id) and status = 'requested' and meeting_url is null
    and starts_at > now() and starts_at < now() + interval '366 days'
  );

create policy client_accounts_staff on public.client_accounts for all to authenticated
  using ((select public.is_client_staff())) with check ((select public.is_client_staff()));
create policy client_members_staff on public.client_members for all to authenticated
  using ((select public.is_client_staff())) with check ((select public.is_client_staff()));
create policy client_projects_staff on public.client_projects for all to authenticated
  using ((select public.is_client_staff())) with check ((select public.is_client_staff()));
create policy client_milestones_staff on public.client_milestones for all to authenticated
  using ((select public.is_client_staff())) with check ((select public.is_client_staff()));
create policy client_project_updates_staff on public.client_project_updates for all to authenticated
  using ((select public.is_client_staff())) with check ((select public.is_client_staff()));
create policy client_documents_staff on public.client_documents for all to authenticated
  using ((select public.is_client_staff())) with check ((select public.is_client_staff()));
create policy client_invoices_staff on public.client_invoices for all to authenticated
  using ((select public.is_client_staff())) with check ((select public.is_client_staff()));
create policy client_meetings_staff on public.client_meetings for all to authenticated
  using ((select public.is_client_staff())) with check ((select public.is_client_staff()));

insert into storage.buckets (id, name, public, file_size_limit)
values ('client-documents', 'client-documents', false, 52428800)
on conflict (id) do nothing;

create policy client_documents_object_read on storage.objects for select to authenticated using (
  bucket_id = 'client-documents' and exists (
    select 1 from public.client_documents d
    where d.storage_path = storage.objects.name and public.can_access_client_project(d.project_id)
  )
);
create policy client_documents_object_staff on storage.objects for all to authenticated
  using (bucket_id = 'client-documents' and (select public.is_client_staff()))
  with check (bucket_id = 'client-documents' and (select public.is_client_staff()));

commit;
