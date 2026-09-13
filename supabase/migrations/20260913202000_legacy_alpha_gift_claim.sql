-- Some legacy auth accounts do not have a profile yet. Finish their grant after
-- normal profile provisioning on login, using the same fixed server-side cohort.
create or replace function public.claim_alpha_background_gift()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null or not exists (
    select 1 from auth.users
    where id = account_id
      and raw_app_meta_data->>'scripticx_v1_alpha_onboarding' = 'true'
  ) then
    raise exception 'This account is not eligible for the Alpha gift' using errcode = '42501';
  end if;
  insert into public.user_reward_inventory (user_id, product_id, acquired_at, equipped_at)
  values (account_id, 'miniscript-background', now(), null)
  on conflict (user_id, product_id) do nothing;
end;
$$;
revoke all on function public.claim_alpha_background_gift() from public, anon;
grant execute on function public.claim_alpha_background_gift() to authenticated;
