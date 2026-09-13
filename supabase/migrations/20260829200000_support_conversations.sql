begin;

-- The contact inbox predates the versioned baseline. Keep a complete definition
-- here so a fresh environment can apply the support conversation migration too.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  topic text not null check (topic in ('bug', 'feature', 'account', 'feedback', 'other')),
  description text not null,
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_user_created_idx
  on public.contact_messages (user_id, created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists contact_messages_read_own on public.contact_messages;
create policy contact_messages_read_own on public.contact_messages
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists contact_messages_admin_all on public.contact_messages;
create policy contact_messages_admin_all on public.contact_messages
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid() and profile.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid() and profile.role = 'admin'
    )
  );

grant select, update, delete on public.contact_messages to authenticated;

-- Support replies used to exist only in the email outbox. Persist the user-facing
-- conversation separately so web and mobile can render the same canonical thread.
create table if not exists public.contact_message_replies (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contact_messages(id) on delete cascade,
  outbox_id uuid not null unique,
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text not null,
  sender_address text not null,
  subject text not null,
  content text not null,
  mode text not null default 'plain' check (mode in ('html', 'plain')),
  created_at timestamptz not null default now()
);

create index if not exists contact_message_replies_contact_created_idx
  on public.contact_message_replies (contact_id, created_at);

alter table public.contact_message_replies enable row level security;

drop policy if exists contact_replies_read_own on public.contact_message_replies;
create policy contact_replies_read_own on public.contact_message_replies
  for select to authenticated
  using (
    exists (
      select 1
      from public.contact_messages message
      where message.id = contact_id
        and message.user_id = auth.uid()
    )
  );

grant select on public.contact_message_replies to authenticated;

alter table public.contact_message_replies replica identity full;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'contact_message_replies'
  ) then
    alter publication supabase_realtime add table public.contact_message_replies;
  end if;
end;
$$;

commit;
