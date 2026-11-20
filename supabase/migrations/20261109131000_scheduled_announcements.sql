begin;

create table public.scheduled_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 160),
  body text not null check (char_length(body) between 2 and 2000),
  show_mascots boolean not null default true,
  images jsonb not null default '[]' check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 3),
  buttons jsonb not null default '[]' check (jsonb_typeof(buttons) = 'array' and jsonb_array_length(buttons) <= 3),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.scheduled_announcement_acknowledgments (
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.scheduled_announcements(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

alter table public.scheduled_announcements enable row level security;
alter table public.scheduled_announcement_acknowledgments enable row level security;
revoke all on public.scheduled_announcements, public.scheduled_announcement_acknowledgments from public, anon, authenticated;
grant select, insert, update on public.scheduled_announcements to service_role;

create function public.next_scheduled_announcement()
returns setof public.scheduled_announcements
language sql stable security definer set search_path = ''
as $$
  select announcement.*
  from public.scheduled_announcements as announcement
  where (select auth.uid()) is not null
    and announcement.disabled_at is null
    and announcement.starts_at <= now()
    and announcement.ends_at > now()
    and not exists (
      select 1 from public.scheduled_announcement_acknowledgments as seen
      where seen.user_id = (select auth.uid()) and seen.announcement_id = announcement.id
    )
  order by announcement.starts_at, announcement.created_at, announcement.id
  limit 1;
$$;

create function public.acknowledge_scheduled_announcement(p_announcement_id uuid)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.scheduled_announcement_acknowledgments (user_id, announcement_id)
  select (select auth.uid()), announcement.id
  from public.scheduled_announcements as announcement
  where announcement.id = p_announcement_id
    and (select auth.uid()) is not null
    and announcement.starts_at <= now()
  on conflict (user_id, announcement_id) do nothing;
$$;

revoke all on function public.next_scheduled_announcement(), public.acknowledge_scheduled_announcement(uuid) from public, anon;
grant execute on function public.next_scheduled_announcement(), public.acknowledge_scheduled_announcement(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('announcement-images', 'announcement-images', true, 3145728, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

commit;
