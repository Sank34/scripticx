begin;

create table if not exists public.problem_editor_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  scope_key text not null default 'library'
    check (char_length(scope_key) between 1 and 160),
  code text not null default ''
    check (char_length(code) <= 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, problem_id, scope_key)
);

create index if not exists problem_editor_drafts_recent_idx
  on public.problem_editor_drafts (user_id, updated_at desc);

drop trigger if exists problem_editor_drafts_set_updated_at
  on public.problem_editor_drafts;
create trigger problem_editor_drafts_set_updated_at
before update on public.problem_editor_drafts
for each row execute function public.scripticx_set_updated_at();

alter table public.problem_editor_drafts enable row level security;

drop policy if exists problem_editor_drafts_select_own
  on public.problem_editor_drafts;
create policy problem_editor_drafts_select_own
on public.problem_editor_drafts for select
to authenticated
using (user_id = auth.uid());

drop policy if exists problem_editor_drafts_insert_own
  on public.problem_editor_drafts;
create policy problem_editor_drafts_insert_own
on public.problem_editor_drafts for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists problem_editor_drafts_update_own
  on public.problem_editor_drafts;
create policy problem_editor_drafts_update_own
on public.problem_editor_drafts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists problem_editor_drafts_delete_own
  on public.problem_editor_drafts;
create policy problem_editor_drafts_delete_own
on public.problem_editor_drafts for delete
to authenticated
using (user_id = auth.uid());

revoke all on public.problem_editor_drafts from anon, authenticated;
grant select, insert, delete on public.problem_editor_drafts to authenticated;
grant update (code) on public.problem_editor_drafts to authenticated;

comment on table public.problem_editor_drafts is
  'Cross-device MiniScript+ editor drafts with updated_at used for optimistic conflict detection.';

commit;
