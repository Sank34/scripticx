-- Optional username allowlists for invite-only competitions.
-- Existing token invitations remain supported; this table adds a durable,
-- per-user invitation path for organizers importing a class roster.

begin;

create table if not exists public.competition_invitees (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  invited_at timestamptz not null default now(),
  primary key (competition_id, user_id)
);

create index if not exists competition_invitees_user_idx
  on public.competition_invitees (user_id, competition_id);

alter table public.competition_invitees enable row level security;
alter table public.competition_invitees force row level security;

drop policy if exists "competition_invitees_select_own" on public.competition_invitees;
create policy "competition_invitees_select_own"
  on public.competition_invitees
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.competition_invitees to authenticated;
grant all on public.competition_invitees to service_role;

commit;
