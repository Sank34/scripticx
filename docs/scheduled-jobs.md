# Scheduled jobs on Vercel Hobby

The repository does not register Vercel Cron Jobs. Hobby rejects schedules that run more than once a day, which blocks deployment. An external scheduler must invoke the existing protected routes instead.

Removing Vercel schedules unblocks this deployment check but does not activate an external scheduler. Until the external jobs are enabled, scheduled email queue processing and notification reminders will not run automatically through these routes.

## Configure cron-job.org

1. In Vercel, confirm that `CRON_SECRET` is set for the Production environment. Keep the value private and do not put it in Git or a URL.
2. In the cron-job.org console, create the following jobs using the production domain. Use the final HTTPS URL without redirects. If the production domain differs from the URLs below, replace it.

| Job | Method | URL | Schedule |
| --- | --- | --- | --- |
| Email queue | GET | `https://platform.scripticx.org/api/cron/email` | Every 5 minutes (`*/5 * * * *`) |
| Notifications | GET | `https://platform.scripticx.org/api/cron/notifications` | Every hour (`0 * * * *`) |

3. For both jobs, add the custom request header `Authorization` with the value `Bearer <CRON_SECRET>`, replacing the placeholder with the same secret configured in Vercel. No request body or user refresh token is needed.
4. Commit and push the configuration change, then deploy that new commit. Redeploying an older commit will reuse its incompatible cron configuration.
5. Test each job against the production deployment and check its response and execution history. These tests perform real queue processing and reminder delivery. A `200` response indicates the route completed; `401` means authorization failed; `503` can indicate missing configuration. Inspect the response and Vercel logs for details.
6. Enable both schedules and failure notifications in the scheduler, then confirm their first scheduled executions succeed. If old Vercel schedules remain visible, verify they are removed so jobs are not triggered by both schedulers.

The routes allow up to 60 seconds, and the email worker request can wait up to 55 seconds. cron-job.org documents a default 30-second execution timeout. Check actual durations during setup; a timeout does not establish whether delivery completed. If runs exceed the scheduler's supported timeout, use a scheduler that supports at least 60 seconds or reduce the work per invocation before relying on it.

External invocations still use Vercel Functions and count toward the project's function usage limits.

## References

- [Vercel cron usage and Hobby scheduling limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [cron-job.org request headers and execution limits](https://cron-job.org/en/faq/)
