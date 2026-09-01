begin;

-- Live Sessions Companion shares durable chat reactions between the web and
-- mobile clients. Presence and code remain ephemeral Supabase Realtime
-- broadcasts, while chat/reactions are persisted for reconnects.
create or replace function public.scripticx_can_access_live_room(
  p_room_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id is not null and (
    exists (
      select 1
      from public.live_rooms room
      where room.id = p_room_id
        and room.owner_id = p_user_id
    )
    or exists (
      select 1
      from public.room_participants participant
      where participant.room_id = p_room_id
        and participant.user_id = p_user_id
        and participant.status = 'accepted'
    )
    or exists (
      select 1
      from public.live_participants participant
      where participant.room_id = p_room_id
        and participant.user_id = p_user_id
    )
  )
$$;

create table if not exists public.live_message_reactions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  message_id uuid not null references public.live_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 32),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create or replace function public.validate_live_message_reaction()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.live_messages message
    where message.id = new.message_id
      and message.room_id = new.room_id
  ) then
    raise exception 'Reaction does not match its live room.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_live_message_reaction on public.live_message_reactions;
create trigger validate_live_message_reaction
before insert or update on public.live_message_reactions
for each row execute function public.validate_live_message_reaction();

create index if not exists live_message_reactions_room_created_idx
  on public.live_message_reactions (room_id, created_at);
create index if not exists live_message_reactions_message_idx
  on public.live_message_reactions (message_id);

alter table public.live_message_reactions enable row level security;

drop policy if exists live_reactions_read_room on public.live_message_reactions;
create policy live_reactions_read_room on public.live_message_reactions
  for select to authenticated
  using (public.scripticx_can_access_live_room(room_id, auth.uid()));

drop policy if exists live_reactions_create_own on public.live_message_reactions;
create policy live_reactions_create_own on public.live_message_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.scripticx_can_access_live_room(room_id, auth.uid())
  );

drop policy if exists live_reactions_delete_own on public.live_message_reactions;
create policy live_reactions_delete_own on public.live_message_reactions
  for delete to authenticated
  using (user_id = auth.uid());

grant execute on function public.scripticx_can_access_live_room(uuid, uuid) to authenticated;
grant select, insert, delete on public.live_message_reactions to authenticated;

-- Make every surface consumed by the companion available to Postgres Changes.
do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array[
    'live_rooms',
    'live_messages',
    'live_message_reactions',
    'room_participants',
    'live_participants'
  ]
  loop
    if to_regclass(format('public.%I', realtime_table)) is null then
      continue;
    end if;

    execute format('alter table public.%I replica identity full', realtime_table);

    if exists (
      select 1 from pg_publication where pubname = 'supabase_realtime'
    ) and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        realtime_table
      );
    end if;
  end loop;
end;
$$;

commit;
