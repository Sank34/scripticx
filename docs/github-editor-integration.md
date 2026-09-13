# GitHub integration for the ScripticX editor

The editor uses a GitHub App for repository access. GitHub OAuth remains the
authentication option for signing in; repository permissions and short-lived
installation tokens are handled separately by the GitHub App.

## Implemented editor flow

- install the ScripticX GitHub App for selected repositories;
- list private and public repositories granted to the installation;
- clone an accessible repository into a new private ScripticX project while
  preserving its supported directory structure;
- connect one ScripticX project to one repository;
- import and pull up to 200 supported text/source files (5 MB total);
- list, switch, and create branches;
- detect added, changed, and deleted managed files;
- create a commit and push it without overwriting unmanaged repository files;
- refuse a push when the remote branch changed, requiring a pull first;
- create a pull request from the active feature branch to the default branch;
- update the editor sync status from signed GitHub push webhooks.

GitHub installation tokens are short-lived and are never stored in the
database or sent to the browser.

## GitHub App settings

Use these URLs for production:

- Homepage URL: `https://platform.scripticx.org`
- Setup URL: `https://platform.scripticx.org/api/github/setup`
- Webhook URL: `https://platform.scripticx.org/api/github/webhook`

Enable **Redirect on update** for the Setup URL.

Repository permissions:

- Contents: **Read and write**
- Pull requests: **Read and write**
- Metadata: **Read-only** (GitHub adds this automatically)

Subscribe to:

- Installation
- Installation repositories
- Push

Choose **Any account** if every ScripticX user should be able to install the
app. Keep **Only on this account** only for internal testing.

## Server environment

Set the following only in the Next.js server environment (local `.env.local`
and every deployed environment):

```dotenv
GITHUB_APP_ID=...
GITHUB_APP_SLUG=...
GITHUB_APP_PRIVATE_KEY_BASE64=...
GITHUB_WEBHOOK_SECRET=...
```

`GITHUB_APP_PRIVATE_KEY_BASE64` is the base64 representation of the `.pem`
private key. None of these variables should use the `NEXT_PUBLIC_` prefix.

The Webhook secret must be the same random value in GitHub App settings and in
the deployed Next.js environment. Generate one locally with:

```bash
openssl rand -hex 32
```

## Database migration

The schema is in:

`supabase/migrations/20260825003000_github_editor_integration.sql`

Apply it only when the remote database is ready:

```bash
npx supabase db push
```

This creates the installation, one-time setup state, project link, and webhook
delivery tables. Browser roles have no direct access; authenticated Next.js
route handlers validate the user and use the service role.

## Deployment and smoke test

1. Add the four GitHub variables to Vercel for Production and Preview.
2. Apply the migration.
3. Deploy the application before enabling the Setup and Webhook URLs.
4. Open `/editor`, save a project, and select **Source control**.
5. Install the GitHub App for a test repository.
6. Use **Clone a project from GitHub** in Command Search and confirm the new
   project opens in Source Control with the default branch selected.
7. Create a feature branch, edit a file, commit and push.
8. Create a pull request and verify it on GitHub.
9. Make an external commit and verify ScripticX reports remote changes.

Do not delete the separate GitHub OAuth App used by Supabase sign-in. It serves
a different purpose from this repository GitHub App.
