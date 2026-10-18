# Editor state and caching

The editor keeps its workspace in a draft scoped to the signed-in user's ID. Files, empty directories, open file tabs, active file, title, description, visibility, dirty state, saved project ID, search terms, selected tool panels and the last 400 output lines are restored when returning to `/editor`.

Drafts use sessionStorage and are written after 300 ms without changes. Navigation/unmount and pagehide flush the latest state. A memory copy preserves navigation within the app if storage is blocked or full. Drafts belong to the current browser tab/session; use Save for durable server storage. Tokens and GitHub credentials are not included.

An explicit code link, documentation import or live-room URL takes precedence over restoring the previous draft. Live collaboration does not write over the personal draft while a live-room URL is active. Switching accounts remounts the editor so the new account cannot inherit another account's workspace. Runtime execution is not resumed from a draft.

Sidebar panels use React Activity to retain their component state when switching tools while suspending hidden effects. Explorer expansion follows the active file rather than every content edit. The terminal stays mounted when switching bottom tabs. Starting or opening another project resets project-specific panel state.

GitHub repository and branch reads use React Query with account/project-specific keys, a five-minute freshness period and thirty-minute garbage collection. Reopening a fresh panel does not reload it. Stale reads refresh in the background while keeping existing data visible; window focus alone does not trigger a refresh. Reads already in flight can finish after hiding a panel and warm its cache.

The clone dialog and source-control panel share the account-level repository query. Saved project connections use a separate account/project query backed by `GET /api/github/project-link?projectId=...`. That route checks project ownership and reads the durable `github_project_links` row. Saving project contents preserves this row; creating another project starts without a connection. Opening a connected project loads its current branch and branch list, then shows source control automatically. It does not pull remote files over local edits or push without an explicit action.

After connecting an initially unsaved project, GitHub sync passes its saved project ID explicitly to persistence. This prevents callbacks captured before the first save from inserting an unlinked duplicate. If that connected project cannot be updated, sync reports a save failure instead of silently creating another project.

Connected projects can display their saved connection without loading every accessible repository first. The workspace observes connection and branch queries even while another sidebar tool is visible. GitHub data is not persisted to browser storage. Manual refresh bypasses freshness; installation callbacks invalidate GitHub queries. Successful link, sync, commit, branch creation and disconnect operations update the corresponding cached link, with branch data invalidated after sync/branch changes.

Regression tests cover draft round-tripping, invalid storage, account isolation, missing file references, cached and concurrent GitHub reads, panel removal during an in-flight request, refresh failures and request enablement.
