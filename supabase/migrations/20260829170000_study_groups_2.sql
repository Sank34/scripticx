begin;

-- Groups 2.0 keeps durable read state, moderation and media metadata in
-- Supabase so the web and mobile clients share exactly the same behavior.
create or replace function public.study_group_active_role(
  p_group_id uuid,
  p_user_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select member.role::text
  from public.study_group_members member
  where member.group_id = p_group_id
    and member.user_id = p_user_id
    and member.status = 'active'
  limit 1
$$;

create table if not exists public.study_group_channel_reads (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  channel_id uuid not null references public.study_group_channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_message_id uuid references public.study_group_messages(id) on delete set null,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (channel_id, user_id)
);

create table if not exists public.study_group_message_pins (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  channel_id uuid not null references public.study_group_channels(id) on delete cascade,
  message_id uuid not null references public.study_group_messages(id) on delete cascade,
  pinned_by uuid not null references auth.users(id) on delete cascade,
  pinned_at timestamptz not null default now(),
  unique (message_id)
);

create table if not exists public.study_group_message_attachments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  channel_id uuid not null references public.study_group_channels(id) on delete cascade,
  message_id uuid not null references public.study_group_messages(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 180),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 15728640),
  url text not null,
  storage_path text not null unique,
  kind text not null check (kind in ('image', 'file')),
  created_at timestamptz not null default now()
);

create table if not exists public.study_group_bans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  banned_by uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.study_group_moderation_log (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.validate_study_group_attachment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.study_group_messages message
    where message.id = new.message_id
      and message.group_id = new.group_id
      and message.channel_id = new.channel_id
      and message.user_id = new.uploaded_by
  ) then
    raise exception 'Attachment does not match its message.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_study_group_attachment on public.study_group_message_attachments;
create trigger validate_study_group_attachment
before insert or update on public.study_group_message_attachments
for each row execute function public.validate_study_group_attachment();

create index if not exists study_group_reads_user_group_idx
  on public.study_group_channel_reads (user_id, group_id, last_read_at desc);
create index if not exists study_group_pins_channel_idx
  on public.study_group_message_pins (channel_id, pinned_at desc);
create index if not exists study_group_attachments_channel_idx
  on public.study_group_message_attachments (channel_id, created_at desc);
create index if not exists study_group_attachments_message_idx
  on public.study_group_message_attachments (message_id);
create index if not exists study_group_bans_group_idx
  on public.study_group_bans (group_id, created_at desc);
create index if not exists study_group_moderation_log_group_idx
  on public.study_group_moderation_log (group_id, created_at desc);

alter table public.study_group_channel_reads enable row level security;
alter table public.study_group_message_pins enable row level security;
alter table public.study_group_message_attachments enable row level security;
alter table public.study_group_bans enable row level security;
alter table public.study_group_moderation_log enable row level security;

drop policy if exists study_group_reads_own on public.study_group_channel_reads;
create policy study_group_reads_own on public.study_group_channel_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.study_group_active_role(group_id, auth.uid()) is not null
  );

drop policy if exists study_group_pins_read_members on public.study_group_message_pins;
create policy study_group_pins_read_members on public.study_group_message_pins
  for select to authenticated
  using (public.study_group_active_role(group_id, auth.uid()) is not null);

drop policy if exists study_group_pins_manage_moderators on public.study_group_message_pins;
create policy study_group_pins_manage_moderators on public.study_group_message_pins
  for all to authenticated
  using (public.study_group_active_role(group_id, auth.uid()) in ('owner', 'admin'))
  with check (public.study_group_active_role(group_id, auth.uid()) in ('owner', 'admin'));

drop policy if exists study_group_attachments_read_members on public.study_group_message_attachments;
create policy study_group_attachments_read_members on public.study_group_message_attachments
  for select to authenticated
  using (public.study_group_active_role(group_id, auth.uid()) is not null);

drop policy if exists study_group_attachments_insert_members on public.study_group_message_attachments;
create policy study_group_attachments_insert_members on public.study_group_message_attachments
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.study_group_active_role(group_id, auth.uid()) is not null
  );

drop policy if exists study_group_attachments_delete_context on public.study_group_message_attachments;
create policy study_group_attachments_delete_context on public.study_group_message_attachments
  for delete to authenticated
  using (
    uploaded_by = auth.uid()
    or public.study_group_active_role(group_id, auth.uid()) in ('owner', 'admin')
  );

drop policy if exists study_group_bans_read_context on public.study_group_bans;
create policy study_group_bans_read_context on public.study_group_bans
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.study_group_active_role(group_id, auth.uid()) in ('owner', 'admin')
  );

drop policy if exists study_group_bans_manage_moderators on public.study_group_bans;
create policy study_group_bans_manage_moderators on public.study_group_bans
  for all to authenticated
  using (public.study_group_active_role(group_id, auth.uid()) in ('owner', 'admin'))
  with check (public.study_group_active_role(group_id, auth.uid()) in ('owner', 'admin'));

drop policy if exists study_group_log_read_moderators on public.study_group_moderation_log;
create policy study_group_log_read_moderators on public.study_group_moderation_log
  for select to authenticated
  using (public.study_group_active_role(group_id, auth.uid()) in ('owner', 'admin'));

create or replace function public.mark_study_group_channel_read(
  p_group_id uuid,
  p_channel_id uuid,
  p_message_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := auth.uid();
  read_at timestamptz := now();
begin
  if account_id is null or public.study_group_active_role(p_group_id, account_id) is null then
    raise exception 'An active group membership is required.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.study_group_channels channel
    where channel.id = p_channel_id and channel.group_id = p_group_id
  ) then
    raise exception 'Channel not found.' using errcode = '22023';
  end if;
  if p_message_id is not null then
    select coalesce(message.created_at, now()) into read_at
    from public.study_group_messages message
    where message.id = p_message_id
      and message.group_id = p_group_id
      and message.channel_id = p_channel_id;
    if not found then
      raise exception 'Message not found.' using errcode = '22023';
    end if;
  end if;
  insert into public.study_group_channel_reads (
    group_id, channel_id, user_id, last_read_message_id, last_read_at
  ) values (
    p_group_id, p_channel_id, account_id, p_message_id, read_at
  )
  on conflict (channel_id, user_id) do update
  set last_read_message_id = excluded.last_read_message_id,
      last_read_at = greatest(public.study_group_channel_reads.last_read_at, excluded.last_read_at);
end;
$$;

create or replace function public.get_study_group_unread_counts(p_group_id uuid)
returns table (channel_id uuid, unread_count bigint, first_unread_message_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null or public.study_group_active_role(p_group_id, account_id) is null then
    raise exception 'An active group membership is required.' using errcode = '42501';
  end if;
  return query
  select channel.id,
    count(message.id) filter (
      where message.created_at > coalesce(read_state.last_read_at, '-infinity'::timestamptz)
        and message.user_id <> account_id
    )::bigint,
    (array_agg(message.id order by message.created_at asc) filter (
      where message.created_at > coalesce(read_state.last_read_at, '-infinity'::timestamptz)
        and message.user_id <> account_id
    ))[1]
  from public.study_group_channels channel
  left join public.study_group_channel_reads read_state
    on read_state.channel_id = channel.id and read_state.user_id = account_id
  left join public.study_group_messages message
    on message.channel_id = channel.id
  where channel.group_id = p_group_id
  group by channel.id, channel.position
  order by channel.position;
end;
$$;

create or replace function public.toggle_study_group_message_pin(
  p_group_id uuid,
  p_message_id uuid,
  p_pin boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := auth.uid();
  message_channel_id uuid;
begin
  if account_id is null or public.study_group_active_role(p_group_id, account_id) not in ('owner', 'admin') then
    raise exception 'Moderator access is required.' using errcode = '42501';
  end if;
  select message.channel_id into message_channel_id
  from public.study_group_messages message
  where message.id = p_message_id and message.group_id = p_group_id;
  if message_channel_id is null then
    raise exception 'Message not found.' using errcode = '22023';
  end if;
  if p_pin then
    insert into public.study_group_message_pins (
      group_id, channel_id, message_id, pinned_by
    ) values (p_group_id, message_channel_id, p_message_id, account_id)
    on conflict (message_id) do nothing;
  else
    delete from public.study_group_message_pins
    where group_id = p_group_id and message_id = p_message_id;
  end if;
  insert into public.study_group_moderation_log (group_id, actor_id, action, metadata)
  values (
    p_group_id,
    account_id,
    case when p_pin then 'message_pinned' else 'message_unpinned' end,
    jsonb_build_object('messageId', p_message_id, 'channelId', message_channel_id)
  );
  return p_pin;
end;
$$;

create or replace function public.update_study_group_channel(
  p_group_id uuid,
  p_channel_id uuid,
  p_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := auth.uid();
  normalized_name text;
begin
  if account_id is null or public.study_group_active_role(p_group_id, account_id) <> 'owner' then
    raise exception 'Only the group owner can manage channels.' using errcode = '42501';
  end if;
  normalized_name := left(trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g')), 48);
  if normalized_name = '' then
    raise exception 'Choose a channel name.' using errcode = '22023';
  end if;
  update public.study_group_channels
  set name = normalized_name
  where id = p_channel_id and group_id = p_group_id;
  if not found then raise exception 'Channel not found.' using errcode = '22023'; end if;
  insert into public.study_group_moderation_log (group_id, actor_id, action, metadata)
  values (p_group_id, account_id, 'channel_renamed', jsonb_build_object('channelId', p_channel_id, 'name', normalized_name));
end;
$$;

create or replace function public.reorder_study_group_channels(
  p_group_id uuid,
  p_channel_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := auth.uid();
  expected_count integer;
begin
  if account_id is null or public.study_group_active_role(p_group_id, account_id) <> 'owner' then
    raise exception 'Only the group owner can manage channels.' using errcode = '42501';
  end if;
  select count(*) into expected_count from public.study_group_channels where group_id = p_group_id;
  if cardinality(p_channel_ids) <> expected_count
    or (select count(distinct value) from unnest(p_channel_ids) value) <> expected_count
    or exists (
      select 1 from unnest(p_channel_ids) value
      where not exists (
        select 1 from public.study_group_channels channel
        where channel.id = value and channel.group_id = p_group_id
      )
    ) then
    raise exception 'The channel order is invalid.' using errcode = '22023';
  end if;
  update public.study_group_channels channel
  set position = ordered.position - 1
  from unnest(p_channel_ids) with ordinality ordered(id, position)
  where channel.id = ordered.id and channel.group_id = p_group_id;
  insert into public.study_group_moderation_log (group_id, actor_id, action, metadata)
  values (p_group_id, account_id, 'channels_reordered', jsonb_build_object('channelIds', p_channel_ids));
end;
$$;

create or replace function public.moderate_study_group_member(
  p_group_id uuid,
  p_member_id uuid,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := auth.uid();
  actor_role text := public.study_group_active_role(p_group_id, auth.uid());
  target_role text := public.study_group_active_role(p_group_id, p_member_id);
begin
  if account_id is null or actor_role not in ('owner', 'admin') then
    raise exception 'Moderator access is required.' using errcode = '42501';
  end if;
  if p_member_id = account_id then
    raise exception 'You cannot moderate your own membership.' using errcode = '22023';
  end if;
  if target_role = 'owner' or (actor_role = 'admin' and target_role = 'admin') then
    raise exception 'You cannot moderate this member.' using errcode = '42501';
  end if;
  if p_action = 'remove' then
    delete from public.study_group_members
    where group_id = p_group_id and user_id = p_member_id and role <> 'owner';
  elsif p_action = 'ban' then
    insert into public.study_group_bans (group_id, user_id, banned_by, reason)
    values (p_group_id, p_member_id, account_id, nullif(trim(p_reason), ''))
    on conflict (group_id, user_id) do update
    set banned_by = excluded.banned_by, reason = excluded.reason, created_at = now();
    delete from public.study_group_members
    where group_id = p_group_id and user_id = p_member_id and role <> 'owner';
  elsif p_action = 'unban' then
    delete from public.study_group_bans where group_id = p_group_id and user_id = p_member_id;
  else
    raise exception 'Unknown moderation action.' using errcode = '22023';
  end if;
  insert into public.study_group_moderation_log (
    group_id, actor_id, target_user_id, action, metadata
  ) values (
    p_group_id,
    account_id,
    p_member_id,
    'member_' || p_action || case when p_action = 'remove' then 'd' else 'ned' end,
    jsonb_build_object('reason', nullif(trim(p_reason), ''))
  );
end;
$$;

create or replace function public.prevent_banned_study_group_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.study_group_bans ban
    where ban.group_id = new.group_id and ban.user_id = new.user_id
  ) then
    raise exception 'This account is banned from the group.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_banned_study_group_membership on public.study_group_members;
create trigger prevent_banned_study_group_membership
before insert or update of status on public.study_group_members
for each row execute function public.prevent_banned_study_group_membership();

create or replace function public.log_study_group_channel_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    insert into public.study_group_moderation_log (group_id, actor_id, action, metadata)
    values (new.group_id, account_id, 'channel_created', jsonb_build_object('channelId', new.id, 'name', new.name));
    return new;
  end if;
  if tg_op = 'DELETE' then
    insert into public.study_group_moderation_log (group_id, actor_id, action, metadata)
    values (old.group_id, account_id, 'channel_deleted', jsonb_build_object('channelId', old.id, 'name', old.name));
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists log_study_group_channel_insert on public.study_group_channels;
create trigger log_study_group_channel_insert
after insert on public.study_group_channels
for each row execute function public.log_study_group_channel_mutation();
drop trigger if exists log_study_group_channel_delete on public.study_group_channels;
create trigger log_study_group_channel_delete
after delete on public.study_group_channels
for each row execute function public.log_study_group_channel_mutation();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-group-attachments',
  'study-group-attachments',
  false,
  15728640,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'text/markdown',
    'application/zip', 'application/json'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists study_group_attachments_storage_read on storage.objects;
create policy study_group_attachments_storage_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'study-group-attachments'
    and public.study_group_active_role((split_part(name, '/', 1))::uuid, auth.uid()) is not null
  );

drop policy if exists study_group_attachments_storage_insert on storage.objects;
create policy study_group_attachments_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'study-group-attachments'
    and owner_id::text = auth.uid()::text
    and public.study_group_active_role((split_part(name, '/', 1))::uuid, auth.uid()) is not null
  );

drop policy if exists study_group_attachments_storage_delete on storage.objects;
create policy study_group_attachments_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'study-group-attachments'
    and (
      owner_id::text = auth.uid()::text
      or public.study_group_active_role((split_part(name, '/', 1))::uuid, auth.uid()) in ('owner', 'admin')
    )
  );

grant select, insert, update, delete on public.study_group_channel_reads to authenticated;
grant select, insert, update, delete on public.study_group_message_pins to authenticated;
grant select, insert, delete on public.study_group_message_attachments to authenticated;
grant select, insert, update, delete on public.study_group_bans to authenticated;
grant select on public.study_group_moderation_log to authenticated;
grant execute on function public.study_group_active_role(uuid, uuid) to authenticated;
grant execute on function public.mark_study_group_channel_read(uuid, uuid, uuid) to authenticated;
grant execute on function public.get_study_group_unread_counts(uuid) to authenticated;
grant execute on function public.toggle_study_group_message_pin(uuid, uuid, boolean) to authenticated;
grant execute on function public.update_study_group_channel(uuid, uuid, text) to authenticated;
grant execute on function public.reorder_study_group_channels(uuid, uuid[]) to authenticated;
grant execute on function public.moderate_study_group_member(uuid, uuid, text, text) to authenticated;

do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array[
    'study_group_channel_reads',
    'study_group_message_pins',
    'study_group_message_attachments',
    'study_group_bans',
    'study_group_moderation_log'
  ] loop
    execute format('alter table public.%I replica identity full', realtime_table);
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
      and not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = realtime_table
      ) then
      execute format('alter publication supabase_realtime add table public.%I', realtime_table);
    end if;
  end loop;
end;
$$;

commit;
