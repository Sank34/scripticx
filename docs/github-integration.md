# ScripticX GitHub integration

This integration deliberately separates authentication from repository access.
Signing in should identify the user; it should not silently grant ScripticX write
access to every repository.

## What is implemented

- GitHub sign in/sign up on `/login` through Supabase Auth.
- GitHub in the **Add another account** popup.
- Identity-only OAuth scopes: `read:user user:email`.
- **Connect GitHub** in Editor → Source control, using Supabase identity linking.
- The connected GitHub username and recent owned public repositories in the
  editor.
- Public repository import, preserving supported files and directories.
- Safe return to `/editor` after linking an identity.

## Configure GitHub sign in

1. In GitHub, open **Settings → Developer settings → OAuth Apps** and create a
   new OAuth App.
2. Use the production ScripticX URL as the Homepage URL.
3. Copy the callback URL displayed in **Supabase → Authentication → Sign In /
   Providers → GitHub** into GitHub's **Authorization callback URL**. For the
   current project it should be:

   ```text
   https://mfzjcisjcnupgzhayljj.supabase.co/auth/v1/callback
   ```

4. Copy the GitHub Client ID and Client Secret into the GitHub provider in
   Supabase and enable the provider.
5. In **Supabase → Authentication → URL Configuration**, keep these redirect
   URLs allow-listed:

   ```text
   http://localhost:3000/auth/callback
   http://localhost:3000/auth-account-callback.html
   https://platform.scripticx.org/auth/callback
   https://platform.scripticx.org/auth-account-callback.html
   ```

6. Enable **Allow manual linking** in Supabase Authentication configuration.
   This is required by Editor → Source control → Connect GitHub. Automatic
   linking still handles OAuth identities with the same verified email.

No GitHub secret is required in the Next.js/Vercel environment for this first
authentication layer. The Client Secret belongs in Supabase Auth.

## Deeper editor integration

Use a separate **GitHub App**, not a broad `repo` OAuth scope on the login
button. A GitHub App lets a user choose individual repositories and gives us
fine-grained, short-lived installation tokens.

Recommended initial permissions:

| Permission | Access | Used for |
| --- | --- | --- |
| Repository metadata | Read | Repository picker and branch metadata |
| Contents | Read & write | Open files, create commits, push changes |
| Pull requests | Read & write | Create and review editor pull requests |

Add Pull request access only when that feature ships. Do not request Issues,
Actions, Administration, or organization permissions until an implemented
feature needs them.

The server-side model should store only the installation relationship:

- `github_installations`: ScripticX user ID, GitHub installation ID, GitHub
  account ID/login, installation target type, timestamps.
- `github_project_links`: ScripticX project ID, installation ID, repository ID,
  owner/name, default branch, tracked branch, timestamps.
- `github_sync_events`: project/repository link, operation, commit SHA, status,
  error and timestamps for a visible sync history.

Installation access tokens should be minted on demand in a server route or
Supabase Edge Function and never persisted in the browser or database. Keep the
GitHub App private key and webhook secret in server-side secrets only.

## Suggested delivery order

1. Register the GitHub App and add the installation callback/webhook endpoints.
2. Add a repository picker scoped to repositories selected during installation.
3. Import a repository into the existing ScripticX project file model.
4. Add branch selection, change detection and a commit dialog.
5. Push to a ScripticX-created branch and open a pull request by default.
6. Add webhook-driven sync state and explicit conflict handling.

Direct pushes to a protected/default branch should not be the default UX.
