begin;

create extension if not exists pgcrypto;

do $$
begin
  if to_regprocedure('public.scripticx_is_admin(uuid)') is null then
    raise exception
      'public.scripticx_is_admin is missing. Apply 20260825160000_class_hub.sql first.';
  end if;
end
$$;

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  summary text check (summary is null or char_length(summary) <= 2000),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'delivered')),
  starts_at timestamptz not null,
  location text check (location is null or char_length(location) <= 180),
  audience text check (audience is null or char_length(audience) <= 180),
  trainers text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workshops_starts_at_idx
  on public.workshops (starts_at desc);

create table if not exists public.workshop_resources (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  kind text not null default 'link'
    check (kind in ('canva', 'slides', 'game', 'doc', 'video', 'link')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  url text not null check (url ~ '^https?://' and char_length(url) <= 2000),
  note text check (note is null or char_length(note) <= 2000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workshop_resources_workshop_idx
  on public.workshop_resources (workshop_id, sort_order, created_at);

create table if not exists public.workshop_sections (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  kind text not null default 'talk'
    check (kind in ('talk', 'demo', 'activity', 'game', 'break', 'qa')),
  duration_minutes integer not null default 15
    check (duration_minutes between 5 and 480),
  led_by text check (led_by is null or char_length(led_by) <= 120),
  notes text check (notes is null or char_length(notes) <= 5000),
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workshop_sections_workshop_idx
  on public.workshop_sections (workshop_id, sort_order, created_at);

create table if not exists public.workshop_section_resources (
  section_id uuid not null
    references public.workshop_sections(id) on delete cascade,
  resource_id uuid not null
    references public.workshop_resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (section_id, resource_id)
);

create index if not exists workshop_section_resources_resource_idx
  on public.workshop_section_resources (resource_id);

create table if not exists public.workshop_comments (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null check (char_length(trim(author_name)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workshop_comments_workshop_idx
  on public.workshop_comments (workshop_id, created_at desc);

drop trigger if exists workshops_set_updated_at on public.workshops;
create trigger workshops_set_updated_at
before update on public.workshops
for each row execute function public.scripticx_set_updated_at();

drop trigger if exists workshop_resources_set_updated_at on public.workshop_resources;
create trigger workshop_resources_set_updated_at
before update on public.workshop_resources
for each row execute function public.scripticx_set_updated_at();

drop trigger if exists workshop_sections_set_updated_at on public.workshop_sections;
create trigger workshop_sections_set_updated_at
before update on public.workshop_sections
for each row execute function public.scripticx_set_updated_at();

drop trigger if exists workshop_comments_set_updated_at on public.workshop_comments;
create trigger workshop_comments_set_updated_at
before update on public.workshop_comments
for each row execute function public.scripticx_set_updated_at();

alter table public.workshops enable row level security;
alter table public.workshop_resources enable row level security;
alter table public.workshop_sections enable row level security;
alter table public.workshop_section_resources enable row level security;
alter table public.workshop_comments enable row level security;

drop policy if exists workshops_admin_all on public.workshops;
create policy workshops_admin_all
on public.workshops for all
to authenticated
using (public.scripticx_is_admin())
with check (public.scripticx_is_admin());

drop policy if exists workshop_resources_admin_all on public.workshop_resources;
create policy workshop_resources_admin_all
on public.workshop_resources for all
to authenticated
using (public.scripticx_is_admin())
with check (public.scripticx_is_admin());

drop policy if exists workshop_sections_admin_all on public.workshop_sections;
create policy workshop_sections_admin_all
on public.workshop_sections for all
to authenticated
using (public.scripticx_is_admin())
with check (public.scripticx_is_admin());

drop policy if exists workshop_section_resources_admin_all
  on public.workshop_section_resources;
create policy workshop_section_resources_admin_all
on public.workshop_section_resources for all
to authenticated
using (public.scripticx_is_admin())
with check (public.scripticx_is_admin());

drop policy if exists workshop_comments_admin_all on public.workshop_comments;
create policy workshop_comments_admin_all
on public.workshop_comments for all
to authenticated
using (public.scripticx_is_admin())
with check (public.scripticx_is_admin());

revoke all on public.workshops from anon, authenticated;
revoke all on public.workshop_resources from anon, authenticated;
revoke all on public.workshop_sections from anon, authenticated;
revoke all on public.workshop_section_resources from anon, authenticated;
revoke all on public.workshop_comments from anon, authenticated;

grant select, insert, delete on public.workshops to authenticated;
grant update (title, summary, status, starts_at, location, audience, trainers)
  on public.workshops to authenticated;

grant select, insert, delete on public.workshop_resources to authenticated;
grant update (kind, title, url, note, sort_order)
  on public.workshop_resources to authenticated;

grant select, insert, delete on public.workshop_sections to authenticated;
grant update (title, kind, duration_minutes, led_by, notes, done, sort_order)
  on public.workshop_sections to authenticated;

grant select, insert, delete on public.workshop_section_resources to authenticated;

grant select, insert, delete on public.workshop_comments to authenticated;
grant update (body, resolved) on public.workshop_comments to authenticated;

create or replace function public.duplicate_workshop(
  p_workshop_id uuid,
  p_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new_id uuid;
  v_new_section_id uuid;
  v_new_resource_id uuid;
  v_resource_map jsonb := '{}'::jsonb;
  v_row record;
begin
  if not public.scripticx_is_admin() then
    raise exception 'Only administrators can duplicate workshops'
      using errcode = '42501';
  end if;

  insert into public.workshops
    (title, summary, status, starts_at, location, audience, trainers, created_by)
  select
    coalesce(nullif(trim(p_title), ''), left(source.title || ' (copy)', 160)),
    source.summary,
    'draft',
    source.starts_at,
    source.location,
    source.audience,
    source.trainers,
    auth.uid()
  from public.workshops as source
  where source.id = p_workshop_id
  returning id into v_new_id;

  if v_new_id is null then
    raise exception 'Workshop % was not found', p_workshop_id
      using errcode = 'no_data_found';
  end if;

  for v_row in
    select * from public.workshop_resources
    where workshop_id = p_workshop_id
    order by sort_order, created_at
  loop
    insert into public.workshop_resources
      (workshop_id, kind, title, url, note, sort_order)
    values
      (v_new_id, v_row.kind, v_row.title, v_row.url, v_row.note, v_row.sort_order)
    returning id into v_new_resource_id;

    v_resource_map := v_resource_map
      || jsonb_build_object(v_row.id::text, v_new_resource_id::text);
  end loop;

  for v_row in
    select * from public.workshop_sections
    where workshop_id = p_workshop_id
    order by sort_order, created_at
  loop
    insert into public.workshop_sections
      (workshop_id, title, kind, duration_minutes, led_by, notes, done, sort_order)
    values
      (v_new_id, v_row.title, v_row.kind, v_row.duration_minutes, v_row.led_by,
       v_row.notes, false, v_row.sort_order)
    returning id into v_new_section_id;

    insert into public.workshop_section_resources (section_id, resource_id)
    select v_new_section_id, (v_resource_map ->> link.resource_id::text)::uuid
    from public.workshop_section_resources as link
    where link.section_id = v_row.id
      and v_resource_map ? link.resource_id::text;
  end loop;

  return v_new_id;
end;
$$;

create or replace function public.move_workshop_section(
  p_section_id uuid,
  p_direction text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workshop_id uuid;
  v_section public.workshop_sections;
  v_neighbour public.workshop_sections;
begin
  if not public.scripticx_is_admin() then
    raise exception 'Only administrators can reorder workshop sections'
      using errcode = '42501';
  end if;

  if p_direction not in ('up', 'down') then
    raise exception 'Direction must be up or down' using errcode = '22023';
  end if;

  select workshop_id into v_workshop_id
  from public.workshop_sections
  where id = p_section_id;

  if not found then
    raise exception 'Section % was not found', p_section_id
      using errcode = 'no_data_found';
  end if;

  perform 1 from public.workshop_sections
  where workshop_id = v_workshop_id
  for update;

  with ordered as (
    select
      id,
      (row_number() over (order by sort_order, created_at)) * 10 as next_order
    from public.workshop_sections
    where workshop_id = v_workshop_id
  )
  update public.workshop_sections as target
  set sort_order = ordered.next_order
  from ordered
  where target.id = ordered.id
    and target.sort_order is distinct from ordered.next_order;

  select * into v_section
  from public.workshop_sections
  where id = p_section_id;

  if p_direction = 'up' then
    select * into v_neighbour
    from public.workshop_sections
    where workshop_id = v_workshop_id and sort_order < v_section.sort_order
    order by sort_order desc
    limit 1;
  else
    select * into v_neighbour
    from public.workshop_sections
    where workshop_id = v_workshop_id and sort_order > v_section.sort_order
    order by sort_order
    limit 1;
  end if;

  if not found then
    return;
  end if;

  update public.workshop_sections
  set sort_order = v_neighbour.sort_order
  where id = v_section.id;

  update public.workshop_sections
  set sort_order = v_section.sort_order
  where id = v_neighbour.id;
end;
$$;

revoke all on function public.duplicate_workshop(uuid, text) from public, anon;
revoke all on function public.move_workshop_section(uuid, text) from public, anon;
grant execute on function public.duplicate_workshop(uuid, text) to authenticated;
grant execute on function public.move_workshop_section(uuid, text) to authenticated;

insert into public.workshops
  (id, title, summary, status, starts_at, location, audience, trainers)
values (
  'a0000000-0000-4000-8000-000000000001',
  'First steps in MiniScript+',
  'A half-day introduction for students with no programming experience: one deck, one live demo, two games, and guided practice on the platform.',
  'scheduled',
  date_trunc('day', now() + interval '7 days') + interval '10 hours',
  'Computer lab 2 · in person',
  'Grades 7–9, up to 24 participants',
  array['Lead trainer', 'Assistant trainer']
)
on conflict (id) do nothing;

insert into public.workshop_resources
  (id, workshop_id, kind, title, url, note, sort_order)
values
  ('b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001', 'canva',
   'Intro deck — What is MiniScript+',
   'https://www.canva.com/design/DAGscripticx01/msp-intro-deck/view',
   'Slides 1–14. Stop at the live demo slide and switch to the editor.', 10),
  ('b0000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000001', 'canva',
   'Closing deck — Where to go next',
   'https://www.canva.com/design/DAGscripticx02/msp-recap-deck/view',
   'Used in the wrap-up. Last slide holds the feedback QR code.', 20),
  ('b0000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-000000000001', 'link',
   'MSP editor (live demo)',
   'https://platform.scripticx.org/editor',
   'Open in a second tab before the workshop and set the font size to 18.', 30),
  ('b0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'doc',
   'MiniScript+ syntax reference',
   'https://platform.scripticx.org/docs',
   'Share the link in chat when participants start the exercises.', 40),
  ('b0000000-0000-4000-8000-000000000005',
   'a0000000-0000-4000-8000-000000000001', 'game',
   'Bug hunt — five broken programs',
   'https://platform.scripticx.org/problems',
   'Teams of two, 3 minutes per program. First correct fix wins the round.', 50),
  ('b0000000-0000-4000-8000-000000000006',
   'a0000000-0000-4000-8000-000000000001', 'game',
   'Speedrun — PRINT the pattern',
   'https://platform.scripticx.org/competitions',
   'Run as a private competition. Leaderboard on the projector.', 60),
  ('b0000000-0000-4000-8000-000000000007',
   'a0000000-0000-4000-8000-000000000001', 'video',
   'Backup recording — loops in MSP',
   'https://platform.scripticx.org/learn',
   'Fallback if the venue has no reliable internet for the live demo.', 70),
  ('b0000000-0000-4000-8000-000000000008',
   'a0000000-0000-4000-8000-000000000001', 'link',
   'Feedback form',
   'https://platform.scripticx.org/contact',
   'Shown in the closing deck and sent again by email afterwards.', 80)
on conflict (id) do nothing;

insert into public.workshop_sections
  (id, workshop_id, title, kind, duration_minutes, led_by, notes, sort_order)
values
  ('c0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001', 'Welcome and setup check', 'talk', 10,
   'Lead trainer',
   'Check that everyone can sign in. Keep two spare accounts ready for participants without email.', 10),
  ('c0000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000001', 'Why MiniScript+ exists', 'talk', 15,
   'Lead trainer',
   'Slides 1–14 of the intro deck. Keep it to one example per idea.', 20),
  ('c0000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-000000000001', 'Live demo — first program', 'demo', 20,
   'Lead trainer',
   'Write PRINT, INPUT and a WHILE loop from scratch. Make one deliberate mistake and read the error message aloud.', 30),
  ('c0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'Game — bug hunt', 'game', 20,
   'Assistant trainer',
   'Teams of two. Assistant trainer keeps score on the whiteboard.', 40),
  ('c0000000-0000-4000-8000-000000000005',
   'a0000000-0000-4000-8000-000000000001', 'Break', 'break', 15,
   null,
   'Leave the docs link on screen.', 50),
  ('c0000000-0000-4000-8000-000000000006',
   'a0000000-0000-4000-8000-000000000001', 'Guided practice — three problems', 'activity', 35,
   'Both trainers',
   'Trainers walk the room. Do not give solutions; ask what the program printed and why.', 60),
  ('c0000000-0000-4000-8000-000000000007',
   'a0000000-0000-4000-8000-000000000001', 'Game — pattern speedrun', 'game', 20,
   'Assistant trainer',
   'Start the private competition five minutes early so invites are ready.', 70),
  ('c0000000-0000-4000-8000-000000000008',
   'a0000000-0000-4000-8000-000000000001', 'Wrap-up, questions and feedback', 'qa', 15,
   'Lead trainer',
   'Closing deck, then leave the feedback link on screen until the room empties.', 80)
on conflict (id) do nothing;

insert into public.workshop_section_resources (section_id, resource_id)
values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000007'),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000005'),
  ('c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000004'),
  ('c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000006'),
  ('c0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000008')
on conflict (section_id, resource_id) do nothing;

insert into public.workshop_comments
  (id, workshop_id, author_name, body, resolved)
values
  ('d0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001', 'Lead trainer',
   'The bug hunt ran long last time. Four programs instead of five keeps us on schedule.', false),
  ('d0000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000001', 'Assistant trainer',
   'Venue Wi-Fi was unreliable in the back row — bring the offline recording as a backup.', false),
  ('d0000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-000000000001', 'Lead trainer',
   'Printed cheat sheets are ordered.', true)
on conflict (id) do nothing;

comment on table public.workshops is
  'Trainer portal workshops. Administrator-only planning surface for hosted sessions.';
comment on table public.workshop_resources is
  'Canva decks, documentation, videos, and games attached to a workshop.';
comment on table public.workshop_sections is
  'Ordered running order of a workshop. Clock times are derived from workshops.starts_at.';
comment on table public.workshop_section_resources is
  'Which resources a trainer opens during a given section.';
comment on table public.workshop_comments is
  'Trainer notes on a workshop, kept across runs.';

commit;
