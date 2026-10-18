Live Share project lifecycle
============================

Apply `supabase/migrations/20261018151000_live_workspace_project_lifecycle.sql` to Supabase before deploying this version. The editor requires the new `get_live_workspace`, `save_live_workspace` and `close_live_workspace` RPCs. There is deliberately no fallback to the previous save path, which cannot guarantee the project binding or closed-session privacy.

Each session has an immutable `live_rooms.project_id`. Starting with an unsaved workspace creates a private project for the owner. Starting from an existing project keeps its ID and GitHub connection; the source project becomes private. Accepted participants can update that bound project while the session is active, including when the owner is offline. They do not receive projects in their own libraries.

The room row locks serialize saves and closure. Closing removes the room's copy of its code, while the owner project retains the latest committed files. Guests retain the session metadata in history. The owner's closed-session RPC reconstructs a workspace from their project; guests receive no workspace or project ID from that RPC. Leaving restores the latest source project for an owner and the previous personal workspace for a guest.

The migration preserves old closed snapshots before removing their shared copies. Existing verified project links are retained without overwriting newer owner files. Unlinked old snapshots become private recovered projects for their owners. Applying the migration is transactional; malformed historical workspace JSON aborts it for investigation rather than silently discarding data.

`lib/live-workspace-lifecycle.test.ts` executes the migration and lifecycle RPCs against PostgreSQL through PGlite. It covers owner-only project creation, offline-owner saves, immutable project bindings, closed-room privacy and unauthorized writes. It does not replace deployment checks against the production database's existing RLS policies and triggers.

Live editor delivery
--------------------

Text and cursor broadcasts use separate 50 ms delivery windows that are not extended by subsequent input. Cursor movement uses `cursor-update` broadcasts; Presence tracks membership and names. `workspace-files` carries only changed file contents. Structural or project metadata changes use a complete `workspace-update`; missing file IDs or renamed paths request a fresh snapshot. Snapshot responses target the requesting client. All participants should reload after deployment to use the same protocol.

File updates merge into the current workspace without replacing unrelated files or the recipient's active tab. Simultaneous edits to the same file still use the last received contents; this transport does not implement CRDT/OT conflict resolution. Monaco applies the smallest changed text range instead of resetting its model, and cursor widgets are reused between updates.

Database persistence remains separate: saves debounce for 800 ms, with a 2 second maximum wait during continuous input. Pending saves include received changes, and leaving flushes the current workspace. `lib/live-workspace-updates.test.ts` checks sustained typing, final delivery, cursor coalescing, compact messages and invalid updates; `lib/editor-text-change.test.ts` checks minimal edits and UTF-16 boundaries.
