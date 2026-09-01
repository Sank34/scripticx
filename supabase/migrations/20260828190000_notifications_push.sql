-- ScripticX notification inbox and mobile push delivery baseline.
--
-- The notification table predates the versioned schema in production. This
-- migration makes fresh databases reproducible and adds device registration
-- plus a transactional push outbox without changing existing notification data.

begin;

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists actor_id uuid references auth.users(id) on delete set null,
  add column if not exists type text,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists href text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists dedupe_key text,
  add column if not exists read_at timestamptz,
  add column if not exists created_at timestamptz default now();

create unique index if not exists notifications_dedupe_key_idx
  on public.notifications (dedupe_key);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke insert, delete on public.notifications from authenticated;
revoke update on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create table if not exists public.class_invitations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint class_invitations_status_check
    check (status in ('pending', 'accepted', 'declined')),
  constraint class_invitations_class_user_key unique (class_id, user_id)
);

create index if not exists class_invitations_user_status_idx
  on public.class_invitations (user_id, status, created_at desc);

alter table public.class_invitations enable row level security;
drop policy if exists "class_invitations_read_participants" on public.class_invitations;
create policy "class_invitations_read_participants"
  on public.class_invitations for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_manage_class(class_id, auth.uid())
  );
revoke insert, update, delete on public.class_invitations from authenticated;
grant select on public.class_invitations to authenticated;

create or replace function public.invite_class_member(
  p_class_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := auth.uid();
  result_id uuid;
begin
  if account_id is null or not public.can_manage_class(p_class_id, account_id) then
    raise exception 'Class management access required.' using errcode = '42501';
  end if;
  if p_user_id is null or p_user_id = account_id then
    raise exception 'Choose another account.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.class_members
    where class_id = p_class_id and user_id = p_user_id
  ) then
    raise exception 'This account is already a class member.' using errcode = '23505';
  end if;

  delete from public.class_invitations
  where class_id = p_class_id
    and user_id = p_user_id
    and status = 'declined';

  insert into public.class_invitations (
    class_id,
    user_id,
    invited_by,
    status,
    responded_at
  )
  values (p_class_id, p_user_id, account_id, 'pending', null)
  on conflict (class_id, user_id) do update
  set invited_by = excluded.invited_by,
      status = 'pending',
      created_at = now(),
      responded_at = null
  returning id into result_id;
  return result_id;
end;
$$;

create or replace function public.respond_class_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := auth.uid();
  invitation public.class_invitations%rowtype;
begin
  select * into invitation
  from public.class_invitations
  where id = p_invitation_id and user_id = account_id
  for update;
  if invitation.id is null then
    raise exception 'Invitation not found.' using errcode = 'P0002';
  end if;
  if invitation.status <> 'pending' then
    return invitation.class_id;
  end if;

  update public.class_invitations
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = invitation.id;

  if p_accept then
    insert into public.class_members (class_id, user_id, role)
    values (invitation.class_id, account_id, 'student')
    on conflict (class_id, user_id) do update set role = 'student';
  end if;
  return invitation.class_id;
end;
$$;

revoke all on function public.invite_class_member(uuid, uuid) from public, anon;
grant execute on function public.invite_class_member(uuid, uuid) to authenticated;
revoke all on function public.respond_class_invitation(uuid, boolean) from public, anon;
grant execute on function public.respond_class_invitation(uuid, boolean) to authenticated;

create table if not exists public.notification_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id text not null,
  expo_push_token text not null,
  platform text not null,
  locale text not null default 'en',
  app_version text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_push_devices_platform_check
    check (platform in ('ios', 'android')),
  constraint notification_push_devices_locale_check
    check (locale in ('en', 'ro')),
  constraint notification_push_devices_installation_key
    unique (user_id, installation_id),
  constraint notification_push_devices_token_key
    unique (expo_push_token)
);

create index if not exists notification_push_devices_user_enabled_idx
  on public.notification_push_devices (user_id, enabled, last_seen_at desc);

alter table public.notification_push_devices enable row level security;

drop policy if exists "push_devices_select_own" on public.notification_push_devices;
create policy "push_devices_select_own"
  on public.notification_push_devices for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "push_devices_insert_own" on public.notification_push_devices;
create policy "push_devices_insert_own"
  on public.notification_push_devices for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push_devices_update_own" on public.notification_push_devices;
create policy "push_devices_update_own"
  on public.notification_push_devices for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "push_devices_delete_own" on public.notification_push_devices;
create policy "push_devices_delete_own"
  on public.notification_push_devices for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.notification_push_devices to authenticated;

create or replace function public.register_notification_push_device(
  p_installation_id text,
  p_expo_push_token text,
  p_platform text,
  p_locale text default 'en',
  p_app_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := auth.uid();
  result_id uuid;
begin
  if account_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if char_length(coalesce(p_installation_id, '')) not between 8 and 160
     or char_length(coalesce(p_expo_push_token, '')) not between 20 and 255
     or p_expo_push_token !~ '^Expo(nent)?PushToken\[[^]]+\]$'
     or p_platform not in ('ios', 'android')
     or p_locale not in ('en', 'ro') then
    raise exception 'Invalid push device.' using errcode = '22023';
  end if;

  -- A physical installation may change authenticated accounts. Transfer the
  -- opaque token instead of leaving notifications routed to the old account.
  delete from public.notification_push_devices
  where expo_push_token = p_expo_push_token and user_id <> account_id;

  insert into public.notification_push_devices (
    user_id,
    installation_id,
    expo_push_token,
    platform,
    locale,
    app_version,
    enabled,
    last_seen_at,
    updated_at
  )
  values (
    account_id,
    p_installation_id,
    p_expo_push_token,
    p_platform,
    p_locale,
    nullif(p_app_version, ''),
    true,
    now(),
    now()
  )
  on conflict (user_id, installation_id) do update
  set expo_push_token = excluded.expo_push_token,
      platform = excluded.platform,
      locale = excluded.locale,
      app_version = excluded.app_version,
      enabled = true,
      last_seen_at = now(),
      updated_at = now()
  returning id into result_id;

  return result_id;
end;
$$;

create or replace function public.disable_notification_push_device(
  p_installation_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_push_devices
  set enabled = false, updated_at = now()
  where user_id = auth.uid() and installation_id = p_installation_id;
end;
$$;

revoke all on function public.register_notification_push_device(text, text, text, text, text)
  from public, anon;
grant execute on function public.register_notification_push_device(text, text, text, text, text)
  to authenticated;
revoke all on function public.disable_notification_push_device(text) from public, anon;
grant execute on function public.disable_notification_push_device(text) to authenticated;

create table if not exists public.notification_push_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  device_id uuid not null references public.notification_push_devices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  expo_ticket_id text,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_push_outbox_status_check
    check (status in ('pending', 'processing', 'sent', 'failed')),
  constraint notification_push_outbox_notification_device_key
    unique (notification_id, device_id)
);

create index if not exists notification_push_outbox_claim_idx
  on public.notification_push_outbox (status, available_at, created_at)
  where status in ('pending', 'processing');

alter table public.notification_push_outbox enable row level security;
revoke all on public.notification_push_outbox from anon, authenticated;

create or replace function public.enqueue_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_push_outbox (
    notification_id,
    device_id,
    user_id
  )
  select new.id, device.id, new.user_id
  from public.notification_push_devices device
  where device.user_id = new.user_id
    and device.enabled = true
  on conflict (notification_id, device_id) do nothing;
  return new;
end;
$$;

drop trigger if exists notifications_enqueue_push on public.notifications;
create trigger notifications_enqueue_push
after insert on public.notifications
for each row execute function public.enqueue_notification_push();

create or replace function public.enqueue_recent_notifications_for_device()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.enabled then
    insert into public.notification_push_outbox (
      notification_id,
      device_id,
      user_id
    )
    select notification.id, new.id, new.user_id
    from public.notifications notification
    where notification.user_id = new.user_id
      and notification.read_at is null
      and notification.created_at >= now() - interval '2 minutes'
    on conflict (notification_id, device_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists notification_device_enqueue_recent on public.notification_push_devices;
create trigger notification_device_enqueue_recent
after insert or update of enabled, expo_push_token on public.notification_push_devices
for each row execute function public.enqueue_recent_notifications_for_device();

create or replace function public.claim_notification_push_batch(p_limit integer default 100)
returns table (
  outbox_id uuid,
  device_id uuid,
  expo_push_token text,
  notification_id uuid,
  notification_type text,
  title text,
  body text,
  href text,
  metadata jsonb,
  unread_count bigint,
  attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;

  return query
  with candidates as (
    select queue.id
    from public.notification_push_outbox queue
    join public.notification_push_devices device on device.id = queue.device_id
    where device.enabled = true
      and queue.attempts < 5
      and queue.available_at <= now()
      and (
        queue.status = 'pending'
        or (queue.status = 'processing' and queue.locked_at < now() - interval '5 minutes')
      )
    order by queue.created_at
    for update of queue skip locked
    limit greatest(1, least(coalesce(p_limit, 100), 100))
  ), claimed as (
    update public.notification_push_outbox queue
    set status = 'processing',
        attempts = queue.attempts + 1,
        locked_at = now(),
        updated_at = now()
    from candidates
    where queue.id = candidates.id
    returning queue.*
  )
  select
    claimed.id,
    device.id,
    device.expo_push_token,
    notification.id,
    notification.type,
    notification.title,
    coalesce(notification.body, ''),
    coalesce(notification.href, ''),
    coalesce(notification.metadata, '{}'::jsonb),
    (
      select count(*)
      from public.notifications unread
      where unread.user_id = claimed.user_id and unread.read_at is null
    ),
    claimed.attempts
  from claimed
  join public.notification_push_devices device on device.id = claimed.device_id
  join public.notifications notification on notification.id = claimed.notification_id;
end;
$$;

revoke all on function public.claim_notification_push_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_push_batch(integer) to service_role;

-- Keep notifications available to Supabase Realtime without failing when the
-- table was already added by the production bootstrap.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

commit;
