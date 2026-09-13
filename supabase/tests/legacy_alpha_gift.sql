begin;
select set_config('request.jwt.claim.sub', (select account.id::text from auth.users account join public.profiles profile on profile.id=account.id where account.raw_app_meta_data->>'scripticx_v1_alpha_onboarding'='true' limit 1), true);
set local role authenticated;
select public.claim_alpha_background_gift();
select public.claim_alpha_background_gift();
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
do $$
begin
  begin
    perform public.claim_alpha_background_gift();
    raise exception 'An ineligible account was allowed to claim';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
select count(*) as eligible,
       count(profile.id) as profiles_ready,
       count(inventory.user_id) as gift_owned,
       has_function_privilege('anon','public.claim_alpha_background_gift()','EXECUTE') as anonymous_can_claim
from auth.users account
left join public.profiles profile on profile.id=account.id
left join public.user_reward_inventory inventory on inventory.user_id=account.id and inventory.product_id='miniscript-background'
where account.raw_app_meta_data->>'scripticx_v1_alpha_onboarding'='true';
rollback;
