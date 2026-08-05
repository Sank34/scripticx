# Competitions deployment

The competitions UI, APIs, and configurable badge rules depend on the database objects in:

`supabase/migrations/202608050100_competitions_and_lockdown.sql`

`supabase/migrations/202608050110_badge_automatic_rules.sql`

## Deployment order

1. Apply both migrations to the target Supabase project, in filename order.
2. Configure `PLATFORM_ACCESS_SECRET` and `CRON_SECRET` with separate random values of at least 32 bytes.
3. Deploy the Next.js application.
4. Schedule an authenticated `GET /api/cron/competitions` request every minute (or every five minutes). Send `Authorization: Bearer <CRON_SECRET>`.
5. Test with one platform admin and one normal user before enabling lockdown mode.

The cron endpoint creates the persistent 30-minute competition reminders. The open competition page also displays a local toast and, when the user already granted browser notification permission, a browser notification.

## Security behavior

- Test cases are loaded only with the service role and are never returned by competition APIs.
- Competition submissions are evaluated and scored server-side.
- Invite tokens are returned once; only their SHA-256 hashes are stored.
- Leaderboards use the best score for each participant/problem pair.
- CSV cells that could be interpreted as spreadsheet formulas are neutralized.
- Lockdown is enforced by the Next.js proxy, authenticated APIs, and restrictive RLS policies. `RouteGuard` is only a UX layer.
- The signed platform-access cookie is HTTP-only and expires after five minutes.

Do not deploy the application changes before the migration: the new routes intentionally fail closed when required competition tables or security functions are unavailable.

The first migration returns the leaderboard rank as `rank_position`. This avoids PostgreSQL's reserved `position` keyword in a `RETURNS TABLE` declaration; the API still exposes the field as `position` to the frontend.
