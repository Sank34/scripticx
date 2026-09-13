begin;

alter table public.platform_settings
  add column if not exists lockdown_mode text not null default 'maintenance';

alter table public.platform_settings
  drop constraint if exists platform_settings_lockdown_mode_check;

alter table public.platform_settings
  add constraint platform_settings_lockdown_mode_check
  check (lockdown_mode in ('maintenance', 'competition'));

commit;
