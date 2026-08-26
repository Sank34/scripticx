/**
 * Workspace personas are self-selected onboarding preferences. They must never
 * be used as authorization roles; `profiles.role` remains the platform
 * `user`/`admin` role and contextual permissions live in membership tables.
 */
export const workspacePersonas = ["learner", "student", "teacher"] as const;

export type WorkspacePersona = (typeof workspacePersonas)[number];

export const workspaceKinds = ["personal", "student", "teacher"] as const;

export type WorkspaceKind = (typeof workspaceKinds)[number];

export const WORKSPACE_SETUP_VERSION = 2;

/**
 * These auth metadata keys are a non-authoritative UI cache. Database settings
 * and workspace memberships must remain the source of truth for access.
 */
export const workspaceMetadataKeys = {
  activeWorkspaceKind: "scripticx_active_workspace_kind",
  persona: "scripticx_workspace_persona",
  setupVersion: "scripticx_workspace_setup_version",
} as const;

const legacyPersonaMetadataKeys = [
  "scripticx_persona",
  "scripticx_account_type",
  "persona",
] as const;

export const PERSONAL_WORKSPACE_ID = "personal-workspace" as const;
export const STUDENT_WORKSPACE_ID = "student-workspace" as const;
export const TEACHER_WORKSPACE_ID = "teacher-workspace" as const;

export type StableWorkspaceId =
  | typeof PERSONAL_WORKSPACE_ID
  | typeof STUDENT_WORKSPACE_ID
  | typeof TEACHER_WORKSPACE_ID;

export type WorkspaceDefinition = Readonly<{
  id: StableWorkspaceId;
  kind: WorkspaceKind;
  route: string;
}>;

export const workspaceDefinitions = {
  personal: {
    id: PERSONAL_WORKSPACE_ID,
    kind: "personal",
    route: "/dashboard",
  },
  student: {
    id: STUDENT_WORKSPACE_ID,
    kind: "student",
    route: "/workspace/student",
  },
  teacher: {
    id: TEACHER_WORKSPACE_ID,
    kind: "teacher",
    route: "/workspace/teacher",
  },
} as const satisfies Record<WorkspaceKind, WorkspaceDefinition>;

export function isWorkspacePersona(value: unknown): value is WorkspacePersona {
  return (
    typeof value === "string" &&
    workspacePersonas.includes(value as WorkspacePersona)
  );
}

export function isWorkspaceKind(value: unknown): value is WorkspaceKind {
  return (
    typeof value === "string" && workspaceKinds.includes(value as WorkspaceKind)
  );
}

export function getDefaultWorkspaceKind(
  persona: WorkspacePersona
): WorkspaceKind {
  if (persona === "student") return "student";
  if (persona === "teacher") return "teacher";
  return "personal";
}

export function getWorkspaceDefinition(
  kind: WorkspaceKind
): WorkspaceDefinition {
  return workspaceDefinitions[kind];
}

export function getDefaultWorkspace(
  persona: WorkspacePersona
): WorkspaceDefinition {
  return getWorkspaceDefinition(getDefaultWorkspaceKind(persona));
}

export function getDefaultWorkspaceRoute(persona: WorkspacePersona): string {
  return getDefaultWorkspace(persona).route;
}

export function getDefaultWorkspaceId(
  persona: WorkspacePersona
): StableWorkspaceId {
  return getDefaultWorkspace(persona).id;
}

export function getProvisionedWorkspaceKinds(
  persona: WorkspacePersona
): readonly WorkspaceKind[] {
  if (persona === "student") return ["personal", "student"];
  if (persona === "teacher") return ["teacher"];
  return ["personal"];
}

export function canAccessWorkspace(
  persona: WorkspacePersona,
  kind: WorkspaceKind
) {
  return getProvisionedWorkspaceKinds(persona).includes(kind);
}

/**
 * Platform administrators can inspect every workspace surface regardless of
 * their onboarding persona. This is intentionally a UI-routing rule only;
 * database authorization continues to be enforced by RLS and contextual
 * membership checks.
 */
export function getAvailableWorkspaceKinds(
  persona: WorkspacePersona,
  isAdmin = false
): readonly WorkspaceKind[] {
  return isAdmin ? workspaceKinds : getProvisionedWorkspaceKinds(persona);
}

export function canAccessWorkspaceForAccount(
  persona: WorkspacePersona,
  kind: WorkspaceKind,
  isAdmin = false
) {
  return isAdmin || canAccessWorkspace(persona, kind);
}

/**
 * Class surfaces belong to the school workspaces. Personal-only accounts do
 * not receive class navigation or direct route access.
 */
export function canAccessClassesForAccount(
  persona: WorkspacePersona,
  isAdmin = false
) {
  return isAdmin || persona === "student" || persona === "teacher";
}

export function getWorkspaceKindFromMetadata(
  metadata: Record<string, unknown> | undefined
): WorkspaceKind | null {
  const value = metadata?.[workspaceMetadataKeys.activeWorkspaceKind];
  return isWorkspaceKind(value) ? value : null;
}

export function getWorkspacePersonaFromMetadata(
  metadata: Record<string, unknown> | undefined
): WorkspacePersona | null {
  const preferredValue = metadata?.[workspaceMetadataKeys.persona];
  if (isWorkspacePersona(preferredValue)) return preferredValue;

  for (const key of legacyPersonaMetadataKeys) {
    const value = metadata?.[key];
    if (isWorkspacePersona(value)) return value;
  }
  return null;
}

export function getWorkspaceLandingRoute(
  metadata: Record<string, unknown> | undefined
): string {
  const activeKind = getWorkspaceKindFromMetadata(metadata);
  if (activeKind) return workspaceDefinitions[activeKind].route;

  const persona = getWorkspacePersonaFromMetadata(metadata) || "learner";
  return getDefaultWorkspaceRoute(persona);
}
