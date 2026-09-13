-- Hidden rewards must stay out of the public shop while remaining readable by
-- the authenticated users who own them. Birthday gifts are intentionally
-- inactive, so an active-only reward_products policy otherwise turns the
-- embedded product in an inventory query into null.

begin;

drop policy if exists "reward_products_select_owned" on public.reward_products;
create policy "reward_products_select_owned"
  on public.reward_products
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_reward_inventory as inventory
      where inventory.user_id = auth.uid()
        and inventory.product_id = reward_products.id
    )
  );

-- Repair claims from environments where a birthday product was temporarily
-- unavailable when the annual claim was recorded. The unique inventory key
-- keeps this operation idempotent.
insert into public.user_reward_inventory (
  user_id,
  product_id,
  acquired_at,
  equipped_at
)
select
  claim.user_id,
  product.id,
  claim.claimed_at,
  null
from public.birthday_reward_claims as claim
cross join public.reward_products as product
where product.id in (
  'birthday-party-decoration',
  'birthday-confetti-background'
)
on conflict (user_id, product_id) do nothing;

commit;
