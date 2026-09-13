# V1 Alpha onboarding rollout

Migration `20260913200000_legacy_alpha_onboarding.sql` snapshots existing auth accounts created before `2026-09-12T21:33:28Z`, without a completion timestamp and without ordinary onboarding already required. It sets the server-owned app metadata flag `scripticx_v1_alpha_onboarding` and the existing user metadata onboarding requirement. Re-running it cannot enroll accounts created after that cutoff or reset completed onboarding.

Only that cohort sees the thank-you modal. Clicking Start onboarding stores `scripticx_alpha_welcome_seen_at` on the account. If setup is interrupted, the normal required onboarding resumes on the next login without repeating the welcome. Completion uses the existing onboarding experience, preparation screen and workspace-specific product tour. It does not reset points, roles, submissions or existing work.

Existing session tokens pick up the flag at their next refresh/sign-in. Newly registered users retain the existing registration/onboarding flow. The marker is a UX rollout flag, not an authorization grant.

After the last question, preferences are saved before the preparation screen starts. Preparation transitions to “Your account is ready” on the same opaque screen, with a shared logo moving into position; the user explicitly starts the tour. Reduced-motion preferences disable that transition. `OnboardingManager` keeps one active phase across same-user metadata updates. `EntrySessionGate` preserves the child tree when navigating between entry pages and other routes, so the tour does not restart when it first opens the editor.

Regression checks: advance the personal tour from step 4 on Dashboard to step 5 in Editor and back; refresh user metadata while answering a setup question; save preferences and refresh the session during preparation, then confirm Ready precedes the tour. Check logo movement and the continuously opaque backdrop on mobile and desktop.

Migration `20260913201000_legacy_alpha_background_gift.sql` grants the existing `miniscript-background` product to that fixed cohort. The welcome modal announces the gift. Ownership is inserted with `ON CONFLICT DO NOTHING`: no points are charged, existing ownership is preserved, and the background is not automatically equipped. The gift is awarded even if a cohort member has already started or completed onboarding.

For legacy auth accounts without a profile, `claim_alpha_background_gift()` finishes the same grant after normal profile provisioning. The security-definer function uses only `auth.uid()`, checks the server-owned cohort flag in `auth.users`, accepts no target user ID, and is callable only by authenticated users. The welcome is shown after the grant succeeds; failures offer Retry. It remains idempotent for existing owners.
