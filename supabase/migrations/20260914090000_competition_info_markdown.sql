alter table public.competitions
  add column if not exists info_i18n jsonb not null default '{}'::jsonb;

comment on column public.competitions.info_i18n is
  'Bilingual Markdown information and rules shown in the public competition Info tab.';
