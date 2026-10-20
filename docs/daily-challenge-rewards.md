# Daily challenge reward correction

The deployed reward function used `daily_challenge_completions.created_at`, but
that table has `completed_at`. Its daily branch also replaced the normal score
reward with the bonus, and the API inserted the completion before rewarding it.
A failed award therefore left a completion that subsequent submissions skipped.

Migration: `supabase/migrations/20261020140000_daily_challenge_rewards.sql`.
Apply this migration **before deploying the accompanying API change**. It replaces
`award_submission_reward(text,text)` without changing its signature. It does not
backfill balances or delete submissions/completions. Do not mark the production
incident fixed until the migration has been applied.

The function now owns completion creation, reward-ledger insertion, and balance
updates in one transaction. The existing profile-row lock serializes claims for a
user; unique submission/completion award indexes remain in place. An exact replay
returns zero additional points. The optional completion argument remains available
for the old API during deployment, but is checked against the verified submission.

Examples for a 37-point challenge:

- First perfect solution: 100 base points + 37 bonus points.
- Previously solved problem: 37 bonus points.
- Repeat completion: zero additional points.
- Previously credited 40%: 60 remaining base points + 37 bonus points.

Only server-verified submissions can claim rewards. Base progress uses credited
verified submissions, while preserving pre-verification legacy progress. Failed,
uncredited server attempts do not consume the base reward. Existing orphan
completions without a ledger award can be recovered on a new accepted submission
(or a retry for the same verified submission). Previously completed historical
challenges are not automatically credited by this migration.

The challenge is matched to the verified submission's date in Europe/Bucharest.
The dashboard/API client, scheduler's current day, and notification validation use
the same calendar. A replay of an older submission cannot claim today's different
challenge. The bonus is read from the scheduled challenge in SQL, never from the
request body.

Local verification uses the real migration in PGlite, with the production table
column names and unique constraints, plus API tests that verify server evaluation,
metadata, failure responses, and absence of standalone completion inserts.
