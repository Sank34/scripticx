do $$
begin
  if not exists (select 1 from public.reward_products where id = 'miniscript-background' and category = 'profile-background') then
    raise exception 'The MiniScript+ Background product must exist before granting the Alpha gift';
  end if;
end;
$$;

-- The cohort was fixed by the preceding migration; never grant this to new signups.
-- Existing ownership and equipped items remain unchanged.
insert into public.user_reward_inventory (user_id, product_id, acquired_at, equipped_at)
select account.id, 'miniscript-background', now(), null
from auth.users as account
join public.profiles as profile on profile.id = account.id
where account.raw_app_meta_data->>'scripticx_v1_alpha_onboarding' = 'true'
on conflict (user_id, product_id) do nothing;
