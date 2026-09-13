# Platform roles

Custom roles are managed at `/admin/roles`. Only a non-banned account with the built-in `profiles.role = 'admin'` can create, edit, delete, or assign them. Accounts may have multiple roles; grants are combined. Custom roles add administrative permissions to normal user access. They do not replace workspace personas or group membership roles.

A Designer role can use `admin.shop` and `maintenance.bypass`. It can open `/admin` and the rewards editor, but cannot access the admin task board, user management, or other administrative modules. Do not grant `admin.tasks` for that role.

## Permission inventory

| Permission | Scope |
| --- | --- |
| `admin.analytics` | Dashboard statistics, onboarding aggregates, activity/problem statistics RPCs |
| `admin.tasks` | Admin tasks and attention dismissals; separate from analytics |
| `admin.users` | Manage ordinary users; cannot promote admins or modify privileged accounts |
| `admin.problems` | Problem authoring, deletion, chapter catalog |
| `admin.daily` | Daily challenge scheduling within `/admin/problems`; does not grant problem or chapter editing |
| `admin.competitions` | Competition administration, invites, problems, breaks, exports, submission review |
| `admin.lessons` | Learning paths, units, lessons, lesson problems, enrollments |
| `admin.workshops` | Workshops, sections, resources, comments, duplicate/reorder RPCs |
| `admin.shop` | Products, reward assets, inventory/transaction administration reads, product removal RPC |
| `admin.badges` | Badge definitions, awards, badge icon storage, deletion RPC |
| `admin.updates` | Platform update publishing |
| `admin.announcements` | Platform announcements API |
| `admin.contact` | Contact messages and replies |
| `admin.email` | Email configuration, campaigns, sending, previews, history |
| `admin.design-system` | Design system reference page |
| `admin.moderation` | Reports, moderation APIs, feed post/comment moderation |
| `admin.platform` | Platform maintenance/competition settings; `/admin/platform` |
| `admin.certificates` | Existing certificate table administration |
| `admin.classes` | Class administration, class creation, GitHub classroom integration |
| `admin.live` | Existing live-room owner administration policies |
| `admin.groups` | Existing `can_manage_study_group` platform administration helper; does not change group membership |
| `maintenance.bypass` | Platform access during maintenance; does not itself grant an admin module |
| `competition.bypass` | Full platform access while participating in competition mode |

Certificate, live-room and group administration grants apply to existing database tools; there are no new dedicated editors for them in this change. Built-in administrator workspace provisioning and role administration remain exclusive to full admins. Native mobile clients outside this repository are not modified.

All roles use the same `/admin` dashboard. Analytics sections and their requests require `admin.analytics`; Tools contains only permitted modules. There is no separate analytics or delegated-role dashboard. Query cache keys include the account and permission set.

## Enforcement

- `requireUser` validates the bearer session, current profile, ban status, current permissions and platform mode on every API request.
- `requireAdmin` resolves only known administrative API modules; unknown routes remain full-admin-only.
- The page guard and navigation use the same permission registry. `useAuth().isAdmin` retains its literal built-in-admin meaning; `can()` and `canAccessAdmin` represent delegated permissions.
- Existing RLS policies retain their publication, ownership and restrictive/permissive semantics. Their admin branches use module-specific permission checks. Storage policies and SECURITY DEFINER RPCs are included.
- Roles and assignments have full-admin-only write policies. User managers can read the directory to identify accounts they cannot modify. Sensitive profile fields remain protected.
- Assignment changes take effect on the next server/database request. Client permission queries refresh on focus and every 30 seconds. Cached navigation is not an authorization boundary.
- Maintenance bypass is checked separately from administrative grants. Competition restrictions affect active participants; ordinary non-participants retain normal access.
- `platform_role_audit` records role and assignment insert/update/delete events with actor, timestamp and before/after values. Only full admins can read it.

## Supabase migrations

Applied to the connected project and recorded in migration history:

- `20260913090000_platform_roles.sql`
- `20260913091000_platform_role_directory.sql`
- `20260913092000_platform_role_competition_scope.sql`

For another environment, apply all three using the normal migration workflow before deploying the application. No accounts are promoted and no roles are preassigned.

## Verification

`supabase/tests/platform_roles.sql` runs in a rollback transaction against an existing ordinary-user fixture. It verifies shop access, task denial, role/profile escalation denial, private permission lookup denial, maintenance bypass, revocation, and competition data isolation. It does not create authentication accounts.

`lib/server/requestSecurity.test.ts` covers API permission boundaries, full admins, banned accounts, maintenance/competition behavior, revoked grants, and unavailable permission lookup.

Visual QA covers role creation, selecting permissions, username search and deletion on desktop and a 390px mobile viewport. The temporary unassigned QA role was removed. End-to-end API testing using a temporary authentication account was not run because automatic approval review rejected that account lifecycle operation.
