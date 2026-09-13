alter table public.profiles
  add column if not exists public_profile_visibility jsonb
  not null
  default '{
    "points": true,
    "activity": true,
    "stats": true,
    "achievements": true,
    "posts": true,
    "submissions": true,
    "socialLinks": true
  }'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_public_profile_visibility_object_check;

alter table public.profiles
  add constraint profiles_public_profile_visibility_object_check
  check (jsonb_typeof(public_profile_visibility) = 'object');

comment on column public.profiles.public_profile_visibility is
  'User-controlled visibility of optional widgets on the public profile.';
