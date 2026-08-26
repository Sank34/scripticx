begin;

-- The profiles table uses column-level UPDATE grants. Columns added after the
-- original grant are not writable automatically, even when the existing RLS
-- policy allows users to update their own profile.
grant update (pronouns, public_profile_visibility)
  on public.profiles
  to authenticated;

-- Both values are rendered by the public profile. Keep the explicit read
-- grants compatible with installations that also use column-level SELECT
-- privileges; row visibility continues to be controlled by the existing RLS
-- policies on public.profiles.
grant select (pronouns, public_profile_visibility)
  on public.profiles
  to anon, authenticated;

commit;
