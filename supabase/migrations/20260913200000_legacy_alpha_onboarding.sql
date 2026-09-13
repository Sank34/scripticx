-- Snapshot only legacy accounts already present when this rollout was prepared.
-- New registrations and accounts already in the normal onboarding flow are excluded.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('scripticx_v1_alpha_onboarding', true),
    raw_user_meta_data = (coalesce(raw_user_meta_data, '{}'::jsonb)
      - 'scripticx_product_tour_completed_at')
      || jsonb_build_object('scripticx_onboarding_required', true),
    updated_at = now()
where created_at < timestamptz '2026-09-12 21:33:28+00'
  and nullif(raw_user_meta_data->>'scripticx_onboarding_completed_at', '') is null
  and coalesce(raw_user_meta_data->>'scripticx_onboarding_required', 'false') <> 'true'
  and coalesce(raw_app_meta_data->>'scripticx_v1_alpha_onboarding', 'false') <> 'true';
