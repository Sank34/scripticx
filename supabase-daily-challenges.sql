create table if not exists public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  problem_id uuid not null references public.problems(id) on delete cascade,
  bonus_points integer not null default 25 check (bonus_points >= 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- insert index in query
create index if not exists daily_challenges_date_idx
  on public.daily_challenges (challenge_date desc);

create index if not exists daily_challenges_problem_idx
  on public.daily_challenges (problem_id);

alter table public.daily_challenges enable row level security;

drop policy if exists "anyone can read active daily challenges" on public.daily_challenges;
create policy "anyone can read active daily challenges"
  on public.daily_challenges
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "admins can manage daily challenges" on public.daily_challenges;
create policy "admins can manage daily challenges"
  on public.daily_challenges
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create table if not exists public.daily_challenge_completions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.daily_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  bonus_points integer not null default 0 check (bonus_points >= 0),
  completed_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index if not exists daily_challenge_completions_user_idx
  on public.daily_challenge_completions (user_id, completed_at desc);

create index if not exists daily_challenge_completions_challenge_idx
  on public.daily_challenge_completions (challenge_id);

alter table public.daily_challenge_completions enable row level security;

drop policy if exists "users can read own daily completions" on public.daily_challenge_completions;
create policy "users can read own daily completions"
  on public.daily_challenge_completions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users can insert own daily completions" on public.daily_challenge_completions;
create policy "users can insert own daily completions"
  on public.daily_challenge_completions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "admins can read daily completions" on public.daily_challenge_completions;
create policy "admins can read daily completions"
  on public.daily_challenge_completions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
