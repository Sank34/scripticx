-- ScripticX mailing center: sender configuration, user preferences,
-- campaigns and a durable/idempotent delivery outbox.

begin;
create table if not exists public.email_config (
  id text primary key default 'global' check (id = 'global'),
  sender_name text not null default 'ScripticX'
    check (char_length(trim(sender_name)) between 1 and 80),
  sender_local_part text not null default 'hello'
    check (sender_local_part ~ '^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$'),
  reply_to text,
  default_mode text not null default 'html' check (default_mode in ('html', 'plain')),
  contact_notifications_enabled boolean not null default true,
  transactional_enabled boolean not null default true,
  marketing_enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.email_config (id)
values ('global')
on conflict (id) do nothing;
create table if not exists public.email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'en' check (locale in ('en', 'ro')),
  newsletter boolean not null default false,
  marketing_consent_at timestamptz,
  marketing_consent_source text,
  marketing_unsubscribed_at timestamptz,
  product_updates boolean not null default false,
  assignments boolean not null default true,
  competitions boolean not null default true,
  social boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  subject text not null check (char_length(trim(subject)) between 1 and 180),
  preheader text check (preheader is null or char_length(preheader) <= 240),
  content text not null check (char_length(content) between 1 and 100000),
  mode text not null check (mode in ('html', 'plain')),
  action_label text check (action_label is null or char_length(action_label) <= 80),
  action_url text check (action_url is null or char_length(action_url) <= 2000),
  audience jsonb not null default '{"type":"subscribers"}'::jsonb
    check (jsonb_typeof(audience) = 'object'),
  sender_name text not null check (char_length(trim(sender_name)) between 1 and 80),
  sender_local_part text not null
    check (sender_local_part ~ '^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$'),
  reply_to text,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  schedule_at timestamptz,
  recipient_count integer not null default 0 check (recipient_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  audience_cursor uuid,
  expansion_complete boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists email_campaigns_status_schedule_idx
  on public.email_campaigns (status, schedule_at, created_at desc);
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.email_campaigns(id) on delete set null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_user_required boolean not null default false,
  recipient text not null check (char_length(recipient) between 3 and 254),
  recipient_first_name text,
  recipient_username text,
  locale text not null default 'en' check (locale in ('en', 'ro')),
  kind text not null
    check (kind in ('campaign', 'one_off', 'transactional', 'admin_alert')),
  category text not null
    check (category in ('newsletter', 'product_updates', 'assignments', 'competitions', 'social', 'security', 'contact')),
  subject text not null check (char_length(subject) between 1 and 180),
  preheader text check (preheader is null or char_length(preheader) <= 240),
  content text not null check (char_length(content) between 1 and 100000),
  mode text not null check (mode in ('html', 'plain')),
  action_label text check (action_label is null or char_length(action_label) <= 80),
  action_url text check (action_url is null or char_length(action_url) <= 2000),
  sender_name text not null check (char_length(trim(sender_name)) between 1 and 80),
  sender_local_part text not null
    check (sender_local_part ~ '^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$'),
  reply_to text,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'sent', 'failed', 'cancelled')),
  dedupe_key text,
  attempts smallint not null default 0 check (attempts between 0 and 10),
  max_attempts smallint not null default 3 check (max_attempts between 1 and 10),
  available_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists email_outbox_dedupe_idx
  on public.email_outbox (dedupe_key);
create index if not exists email_outbox_delivery_idx
  on public.email_outbox (status, available_at, created_at)
  where status in ('queued', 'processing');
create index if not exists email_outbox_campaign_idx
  on public.email_outbox (campaign_id, status);
-- A shared, database-backed provider gate protects Resend even when the cron
-- worker and an immediate test/one-off delivery run concurrently.
create table if not exists public.email_provider_rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);
create or replace function public.consume_email_provider_rate_limit(
  p_key text,
  p_limit integer default 4,
  p_window_seconds integer default 1
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized_key text := left(trim(coalesce(p_key, '')), 120);
  normalized_limit integer := least(greatest(coalesce(p_limit, 4), 1), 100);
  normalized_window integer := least(greatest(coalesce(p_window_seconds, 1), 1), 3600);
  current_count integer;
begin
  if normalized_key = '' then
    return false;
  end if;

  insert into public.email_provider_rate_limits as limiter (
    key,
    window_started_at,
    request_count,
    updated_at
  )
  values (normalized_key, clock_timestamp(), 1, clock_timestamp())
  on conflict (key) do update
  set
    window_started_at = case
      when limiter.window_started_at <= clock_timestamp() - make_interval(secs => normalized_window)
        then clock_timestamp()
      else limiter.window_started_at
    end,
    request_count = case
      when limiter.window_started_at <= clock_timestamp() - make_interval(secs => normalized_window)
        then 1
      else limiter.request_count + 1
    end,
    updated_at = clock_timestamp()
  returning request_count into current_count;

  return current_count <= normalized_limit;
end;
$$;
create or replace function public.scripticx_mail_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists email_config_set_updated_at on public.email_config;
create trigger email_config_set_updated_at
before update on public.email_config
for each row execute function public.scripticx_mail_set_updated_at();
drop trigger if exists email_preferences_set_updated_at on public.email_preferences;
create trigger email_preferences_set_updated_at
before update on public.email_preferences
for each row execute function public.scripticx_mail_set_updated_at();
drop trigger if exists email_campaigns_set_updated_at on public.email_campaigns;
create trigger email_campaigns_set_updated_at
before update on public.email_campaigns
for each row execute function public.scripticx_mail_set_updated_at();
drop trigger if exists email_outbox_set_updated_at on public.email_outbox;
create trigger email_outbox_set_updated_at
before update on public.email_outbox
for each row execute function public.scripticx_mail_set_updated_at();
-- Campaign audience resolution happens inside Postgres so auth.users email
-- addresses never need to be exposed to a browser. Every broadcast audience,
-- including explicit user lists, remains subject to newsletter opt-in.
create or replace function public.get_email_campaign_recipients(p_audience jsonb)
returns table (
  user_id uuid,
  email text,
  locale text,
  first_name text,
  username text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    account.id,
    lower(account.email),
    case
      when preference.locale = 'ro' then 'ro'
      else 'en'
    end,
    split_part(
      coalesce(
        nullif(account.raw_user_meta_data ->> 'full_name', ''),
        nullif(account.raw_user_meta_data ->> 'name', ''),
        nullif(profile.username, ''),
        split_part(account.email, '@', 1)
      ),
      ' ',
      1
    ),
    coalesce(nullif(profile.username, ''), split_part(account.email, '@', 1))
  from auth.users as account
  join public.email_preferences as preference on preference.user_id = account.id
  left join public.profiles as profile on profile.id = account.id
  where account.email is not null
    and account.email_confirmed_at is not null
    and preference.newsletter = true
    and preference.marketing_consent_at is not null
    and coalesce(p_audience ->> 'type', 'subscribers') in ('subscribers', 'segment', 'users')
    and (
      coalesce(p_audience ->> 'type', 'subscribers') = 'subscribers'
      or (
        p_audience ->> 'type' = 'segment'
        and (
          (p_audience ->> 'segment' = 'admins' and profile.role = 'admin')
          or (
            p_audience ->> 'segment' = 'teachers'
            and (
              account.raw_user_meta_data ->> 'scripticx_workspace_persona' = 'teacher'
            )
          )
          or (
            p_audience ->> 'segment' = 'students'
            and (
              account.raw_user_meta_data ->> 'scripticx_workspace_persona' = 'student'
            )
          )
        )
      )
      or (
        p_audience ->> 'type' = 'users'
        and account.id in (
          select value::uuid
          from jsonb_array_elements_text(coalesce(p_audience -> 'userIds', '[]'::jsonb))
          where value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        )
      )
    );
$$;
create or replace function public.get_email_recipient(
  p_user_id uuid,
  p_category text
)
returns table (
  user_id uuid,
  email text,
  locale text,
  first_name text,
  username text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    account.id,
    lower(account.email),
    case
      when preference.locale = 'ro' then 'ro'
      when account.raw_user_meta_data ->> 'locale' = 'ro' then 'ro'
      else 'en'
    end,
    split_part(
      coalesce(
        nullif(account.raw_user_meta_data ->> 'full_name', ''),
        nullif(account.raw_user_meta_data ->> 'name', ''),
        nullif(profile.username, ''),
        split_part(account.email, '@', 1)
      ),
      ' ',
      1
    ),
    coalesce(nullif(profile.username, ''), split_part(account.email, '@', 1))
  from auth.users as account
  left join public.email_preferences as preference on preference.user_id = account.id
  left join public.profiles as profile on profile.id = account.id
  where account.id = p_user_id
    and account.email is not null
    and account.email_confirmed_at is not null
    and (
      p_category = 'security'
      or (p_category = 'contact' and profile.role = 'admin')
      or (p_category = 'assignments' and coalesce(preference.assignments, true))
      or (p_category = 'competitions' and coalesce(preference.competitions, true))
      or (p_category = 'social' and coalesce(preference.social, false))
      or (
        p_category = 'product_updates'
        and coalesce(preference.product_updates, false)
        and preference.marketing_consent_at is not null
      )
      or (
        p_category = 'newsletter'
        and coalesce(preference.newsletter, false)
        and preference.marketing_consent_at is not null
      )
    );
$$;
create or replace function public.get_admin_email_recipients()
returns table (
  user_id uuid,
  email text,
  locale text,
  first_name text,
  username text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    account.id,
    lower(account.email),
    case
      when preference.locale = 'ro' then 'ro'
      when account.raw_user_meta_data ->> 'locale' = 'ro' then 'ro'
      else 'en'
    end,
    split_part(
      coalesce(
        nullif(account.raw_user_meta_data ->> 'full_name', ''),
        nullif(account.raw_user_meta_data ->> 'name', ''),
        nullif(profile.username, ''),
        split_part(account.email, '@', 1)
      ),
      ' ',
      1
    ),
    coalesce(nullif(profile.username, ''), split_part(account.email, '@', 1))
  from auth.users as account
  join public.profiles as profile on profile.id = account.id
  left join public.email_preferences as preference on preference.user_id = account.id
  where profile.role = 'admin'
    and account.email is not null
    and account.email_confirmed_at is not null;
$$;
-- Atomic worker claim prevents two cron invocations from sending the same row.
create or replace function public.claim_email_outbox(
  p_limit integer default 25,
  p_marketing_enabled boolean default true
)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Consent and the current verified address are checked again at claim time.
  -- A campaign may have been expanded minutes before the recipient opted out
  -- or changed their email address.
  update public.email_outbox as marketing
  set
    status = 'cancelled',
    last_error = 'Recipient is no longer eligible for marketing email',
    updated_at = now()
  where marketing.status = 'queued'
    and marketing.category in ('newsletter', 'product_updates')
    and marketing.recipient_user_id is not null
    and not exists (
      select 1
      from auth.users as account
      join public.email_preferences as preference on preference.user_id = account.id
      where account.id = marketing.recipient_user_id
        and account.email is not null
        and account.email_confirmed_at is not null
        and lower(account.email) = lower(marketing.recipient)
        and preference.marketing_consent_at is not null
        and (
          (marketing.category = 'newsletter' and preference.newsletter)
          or (marketing.category = 'product_updates' and preference.product_updates)
        )
    );

  -- Keep a durable history row when an account is deleted, but never deliver
  -- an internal message to the stale address left behind by ON DELETE SET NULL.
  update public.email_outbox as orphaned
  set
    status = 'cancelled',
    last_error = 'Recipient account no longer exists',
    updated_at = now()
  where orphaned.status = 'queued'
    and orphaned.recipient_user_required = true
    and orphaned.recipient_user_id is null;

  update public.email_outbox as disabled
  set
    status = 'cancelled',
    last_error = 'Email category was disabled before delivery',
    updated_at = now()
  where disabled.status = 'queued'
    and (
      (
        disabled.category = 'contact'
        and not exists (
          select 1 from public.email_config
          where id = 'global' and contact_notifications_enabled = true
        )
      )
      or (
        disabled.kind = 'transactional'
        and not exists (
          select 1 from public.email_config
          where id = 'global' and transactional_enabled = true
        )
      )
    );

  update public.email_outbox as stale
  set
    status = 'failed',
    last_error = coalesce(stale.last_error, 'Delivery worker timed out'),
    updated_at = now()
  where stale.status = 'processing'
    and stale.last_attempt_at < now() - interval '10 minutes'
    and stale.attempts >= stale.max_attempts;

  -- Resend idempotency keys expire after 24 hours. An older processing row is
  -- ambiguous, so stop it for manual review rather than risk a duplicate.
  update public.email_outbox as ambiguous
  set
    status = 'failed',
    last_error = coalesce(ambiguous.last_error, 'Ambiguous stale delivery requires manual review'),
    updated_at = now()
  where ambiguous.status = 'processing'
    and ambiguous.last_attempt_at < now() - interval '23 hours';

  return query
  with candidates as (
    select message.id
    from public.email_outbox as message
    where (
        (message.status = 'queued' and message.available_at <= now())
        or (
          message.status = 'processing'
          and message.last_attempt_at < now() - interval '10 minutes'
          and message.last_attempt_at >= now() - interval '23 hours'
        )
      )
      and message.attempts < message.max_attempts
      and (
        p_marketing_enabled
        or message.category not in ('newsletter', 'product_updates')
      )
    order by message.available_at, message.created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 100)
  )
  update public.email_outbox as message
  set
    status = 'processing',
    attempts = message.attempts + 1,
    last_attempt_at = now(),
    updated_at = now()
  from candidates
  where message.id = candidates.id
  returning message.*;
end;
$$;
-- Expands a campaign in bounded batches. This keeps an administrator request
-- fast even for a large audience and lets cron resume safely after a crash.
create or replace function public.expand_email_campaign(
  p_campaign_id uuid,
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  campaign public.email_campaigns%rowtype;
  batch_count integer := 0;
  last_user_id uuid;
begin
  select * into campaign
  from public.email_campaigns
  where id = p_campaign_id
  for update;

  if campaign.id is null or campaign.status <> 'sending' or campaign.expansion_complete then
    return 0;
  end if;

  if not exists (
    select 1 from public.email_config
    where id = 'global' and marketing_enabled = true
  ) then
    return 0;
  end if;

  select max(recipient.user_id::text)::uuid, count(*)
  into last_user_id, batch_count
  from (
    select source.user_id
    from public.get_email_campaign_recipients(campaign.audience) as source
    where campaign.audience_cursor is null
      or source.user_id > campaign.audience_cursor
    order by source.user_id
    limit least(greatest(p_limit, 1), 1000)
  ) as recipient;

  insert into public.email_outbox (
    campaign_id,
    recipient_user_id,
    recipient_user_required,
    recipient,
    recipient_first_name,
    recipient_username,
    locale,
    kind,
    category,
    subject,
    preheader,
    content,
    mode,
    action_label,
    action_url,
    sender_name,
    sender_local_part,
    reply_to,
    dedupe_key
  )
  select
    campaign.id,
    recipient.user_id,
    true,
    recipient.email,
    recipient.first_name,
    recipient.username,
    recipient.locale,
    'campaign',
    'newsletter',
    campaign.subject,
    campaign.preheader,
    campaign.content,
    campaign.mode,
    campaign.action_label,
    campaign.action_url,
    campaign.sender_name,
    campaign.sender_local_part,
    campaign.reply_to,
    'campaign:' || campaign.id::text || ':user:' || recipient.user_id::text
  from (
    select source.*
    from public.get_email_campaign_recipients(campaign.audience) as source
    where campaign.audience_cursor is null
      or source.user_id > campaign.audience_cursor
    order by source.user_id
    limit least(greatest(p_limit, 1), 1000)
  ) as recipient
  on conflict (dedupe_key) do nothing;

  update public.email_campaigns
  set
    audience_cursor = coalesce(last_user_id, audience_cursor),
    expansion_complete = batch_count < least(greatest(p_limit, 1), 1000),
    recipient_count = (
      select count(*) from public.email_outbox where campaign_id = campaign.id
    ),
    updated_at = now()
  where id = campaign.id;

  return batch_count;
end;
$$;
alter table public.email_config enable row level security;
alter table public.email_preferences enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_outbox enable row level security;
alter table public.email_provider_rate_limits enable row level security;
-- Preferences are changed through the authenticated server route. Mailing
-- center tables intentionally have no client policies and remain service-only.
revoke all on public.email_config from public, anon, authenticated;
revoke all on public.email_preferences from public, anon, authenticated;
revoke all on public.email_campaigns from public, anon, authenticated;
revoke all on public.email_outbox from public, anon, authenticated;
revoke all on public.email_provider_rate_limits from public, anon, authenticated;
revoke all on function public.get_email_campaign_recipients(jsonb) from public, anon, authenticated;
revoke all on function public.get_email_recipient(uuid, text) from public, anon, authenticated;
revoke all on function public.get_admin_email_recipients() from public, anon, authenticated;
revoke all on function public.claim_email_outbox(integer, boolean) from public, anon, authenticated;
revoke all on function public.expand_email_campaign(uuid, integer) from public, anon, authenticated;
revoke all on function public.consume_email_provider_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_email_campaign_recipients(jsonb) to service_role;
grant execute on function public.get_email_recipient(uuid, text) to service_role;
grant execute on function public.get_admin_email_recipients() to service_role;
grant execute on function public.claim_email_outbox(integer, boolean) to service_role;
grant execute on function public.expand_email_campaign(uuid, integer) to service_role;
grant execute on function public.consume_email_provider_rate_limit(text, integer, integer) to service_role;
grant all on public.email_config to service_role;
grant all on public.email_preferences to service_role;
grant all on public.email_campaigns to service_role;
grant all on public.email_outbox to service_role;
grant all on public.email_provider_rate_limits to service_role;
comment on table public.email_preferences is
  'User-controlled email categories. Security/account verification is intentionally not optional.';
comment on table public.email_outbox is
  'Durable, idempotent server-only queue. Never expose recipient addresses to browser clients.';
comment on table public.email_provider_rate_limits is
  'Server-only shared provider throttle used by the Supabase email worker.';
commit;
