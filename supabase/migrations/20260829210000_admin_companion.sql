-- ScripticX Admin Companion baseline.
--
-- Adds a canonical report queue, a moderation audit trail, and durable cron
-- run receipts. The mobile client only talks to authenticated admin APIs; no
-- service-role or cron secret is ever exposed to a device.

begin;

create extension if not exists pgcrypto;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  reviewed_by uuid references auth.users(id) on delete set null,
  resolution_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_reports_target_type_check
    check (target_type in ('user', 'post', 'comment', 'group', 'group_message')),
  constraint content_reports_reason_check
    check (reason in ('spam', 'harassment', 'inappropriate', 'impersonation', 'other')),
  constraint content_reports_status_check
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint content_reports_target_id_length_check
    check (char_length(target_id) between 1 and 200),
  constraint content_reports_details_length_check
    check (details is null or char_length(details) <= 2000),
  constraint content_reports_resolution_length_check
    check (resolution_note is null or char_length(resolution_note) <= 2000)
);

create index if not exists content_reports_status_created_idx
  on public.content_reports (status, created_at desc);
create index if not exists content_reports_target_user_idx
  on public.content_reports (target_user_id, created_at desc)
  where target_user_id is not null;
create index if not exists content_reports_reporter_created_idx
  on public.content_reports (reporter_id, created_at desc);

alter table public.content_reports enable row level security;

drop policy if exists content_reports_insert_own on public.content_reports;

drop policy if exists content_reports_read_own on public.content_reports;
create policy content_reports_read_own on public.content_reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.scripticx_is_admin(auth.uid()));

drop policy if exists content_reports_admin_update on public.content_reports;
create policy content_reports_admin_update on public.content_reports
  for update to authenticated
  using (public.scripticx_is_admin(auth.uid()))
  with check (public.scripticx_is_admin(auth.uid()));

revoke insert, update, delete on public.content_reports from authenticated;
grant select on public.content_reports to authenticated;

create table if not exists public.admin_moderation_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  report_id uuid references public.content_reports(id) on delete set null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_moderation_log_action_check
    check (action in ('ban_user', 'unban_user', 'review_report', 'resolve_report', 'dismiss_report', 'reopen_report')),
  constraint admin_moderation_log_note_length_check
    check (note is null or char_length(note) <= 2000)
);

create index if not exists admin_moderation_log_created_idx
  on public.admin_moderation_log (created_at desc);
create index if not exists admin_moderation_log_target_user_idx
  on public.admin_moderation_log (target_user_id, created_at desc)
  where target_user_id is not null;

alter table public.admin_moderation_log enable row level security;

drop policy if exists admin_moderation_log_admin_read on public.admin_moderation_log;
create policy admin_moderation_log_admin_read on public.admin_moderation_log
  for select to authenticated
  using (public.scripticx_is_admin(auth.uid()));

grant select on public.admin_moderation_log to authenticated;

create table if not exists public.system_job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  result jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  constraint system_job_runs_job_check
    check (job in ('notifications', 'email')),
  constraint system_job_runs_status_check
    check (status in ('running', 'succeeded', 'failed')),
  constraint system_job_runs_error_length_check
    check (error is null or char_length(error) <= 2000)
);

create index if not exists system_job_runs_job_started_idx
  on public.system_job_runs (job, started_at desc);
create index if not exists system_job_runs_status_started_idx
  on public.system_job_runs (status, started_at desc);

alter table public.system_job_runs enable row level security;

drop policy if exists system_job_runs_admin_read on public.system_job_runs;
create policy system_job_runs_admin_read on public.system_job_runs
  for select to authenticated
  using (public.scripticx_is_admin(auth.uid()));

grant select on public.system_job_runs to authenticated;

commit;
