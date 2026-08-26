alter table public.profiles
  add column if not exists pronouns text;

alter table public.profiles
  drop constraint if exists profiles_pronouns_format_check;

alter table public.profiles
  add constraint profiles_pronouns_format_check
  check (
    pronouns is null
    or (
      char_length(pronouns) between 1 and 40
      and pronouns !~ '[\r\n]'
    )
  );

comment on column public.profiles.pronouns is
  'Optional user-supplied pronouns displayed on the profile when present.';
