import { describe, expect, it } from "vitest";

import {
  PERSONAL_WORKSPACE_ID,
  STUDENT_WORKSPACE_ID,
  TEACHER_WORKSPACE_ID,
  getDefaultWorkspace,
  getDefaultWorkspaceId,
  getDefaultWorkspaceKind,
  getDefaultWorkspaceRoute,
  getAvailableWorkspaceKinds,
  getProvisionedWorkspaceKinds,
  canAccessWorkspace,
  canAccessWorkspaceForAccount,
  canAccessClassesForAccount,
  getWorkspaceKindFromMetadata,
  getWorkspaceLandingRoute,
  getWorkspacePersonaFromMetadata,
  isWorkspaceKind,
  isWorkspacePersona,
  resolveWorkspaceIdForKind,
  workspaceMetadataKeys,
} from "@/lib/workspaces";

describe("workspace identity", () => {
  it("maps each onboarding persona to its stable default workspace", () => {
    expect(getDefaultWorkspaceKind("learner")).toBe("personal");
    expect(getDefaultWorkspaceKind("student")).toBe("student");
    expect(getDefaultWorkspaceKind("teacher")).toBe("teacher");

    expect(getDefaultWorkspaceId("learner")).toBe(PERSONAL_WORKSPACE_ID);
    expect(getDefaultWorkspaceId("student")).toBe(STUDENT_WORKSPACE_ID);
    expect(getDefaultWorkspaceId("teacher")).toBe(TEACHER_WORKSPACE_ID);
    expect(getDefaultWorkspace("student")).toEqual({
      id: STUDENT_WORKSPACE_ID,
      kind: "student",
      route: "/workspace/student",
    });
  });

  it("provides routes and provisioning sets for every persona", () => {
    expect(getDefaultWorkspaceRoute("learner")).toBe("/dashboard");
    expect(getDefaultWorkspaceRoute("student")).toBe("/workspace/student");
    expect(getDefaultWorkspaceRoute("teacher")).toBe("/workspace/teacher");
    expect(getProvisionedWorkspaceKinds("learner")).toEqual(["personal"]);
    expect(getProvisionedWorkspaceKinds("student")).toEqual([
      "personal",
      "student",
    ]);
    expect(getProvisionedWorkspaceKinds("teacher")).toEqual(["teacher"]);
    expect(canAccessWorkspace("student", "personal")).toBe(true);
    expect(canAccessWorkspace("student", "teacher")).toBe(false);
    expect(canAccessWorkspace("teacher", "personal")).toBe(false);
    expect(canAccessWorkspace("learner", "student")).toBe(false);
  });

  it("lets platform administrators open every workspace", () => {
    expect(getAvailableWorkspaceKinds("learner", true)).toEqual([
      "personal",
      "student",
      "teacher",
    ]);
    expect(canAccessWorkspaceForAccount("learner", "student", true)).toBe(
      true
    );
    expect(canAccessWorkspaceForAccount("student", "teacher", true)).toBe(
      true
    );
    expect(canAccessWorkspaceForAccount("teacher", "personal", true)).toBe(
      true
    );
  });

  it("keeps persona access restrictions for regular accounts", () => {
    expect(getAvailableWorkspaceKinds("teacher", false)).toEqual(["teacher"]);
    expect(canAccessWorkspaceForAccount("teacher", "personal", false)).toBe(
      false
    );
    expect(canAccessClassesForAccount("learner")).toBe(false);
    expect(canAccessClassesForAccount("student")).toBe(true);
    expect(canAccessClassesForAccount("teacher")).toBe(true);
    expect(canAccessClassesForAccount("learner", true)).toBe(true);
  });
});

describe("workspace metadata", () => {
  it("uses the canonical persona key and reads legacy aliases", () => {
    expect(workspaceMetadataKeys.persona).toBe("scripticx_workspace_persona");
    expect(
      getWorkspacePersonaFromMetadata({
        [workspaceMetadataKeys.persona]: "student",
      })
    ).toBe("student");
    expect(getWorkspacePersonaFromMetadata({ scripticx_persona: "teacher" })).toBe(
      "teacher"
    );
    expect(getWorkspacePersonaFromMetadata({ persona: "admin" })).toBeNull();
  });

  it("safely narrows persona and workspace-kind values", () => {
    expect(isWorkspacePersona("learner")).toBe(true);
    expect(isWorkspacePersona("admin")).toBe(false);
    expect(isWorkspaceKind("personal")).toBe(true);
    expect(isWorkspaceKind(null)).toBe(false);
    expect(
      getWorkspaceKindFromMetadata({
        [workspaceMetadataKeys.activeWorkspaceKind]: "student",
      })
    ).toBe("student");
    expect(
      getWorkspaceKindFromMetadata({
        [workspaceMetadataKeys.activeWorkspaceKind]: "unknown",
      })
    ).toBeNull();
  });

  it("restores the last active workspace and falls back to the persona default", () => {
    expect(
      getWorkspaceLandingRoute({
        [workspaceMetadataKeys.persona]: "student",
        [workspaceMetadataKeys.activeWorkspaceKind]: "personal",
      })
    ).toBe("/dashboard");
    expect(
      getWorkspaceLandingRoute({
        [workspaceMetadataKeys.persona]: "student",
      })
    ).toBe("/workspace/student");
    expect(getWorkspaceLandingRoute(undefined)).toBe("/dashboard");
  });
});

describe("workspace database selection", () => {
  it("prefers the signed-in account's provisioned default workspace", () => {
    const ownedDefault = "80d44d1e-5589-47d8-8e2e-50f162d59f58";

    expect(
      resolveWorkspaceIdForKind(
        [
          {
            id: "c56417df-11a8-4292-9424-21531ac8f1d4",
            kind: "student",
            created_by: "another-user",
            is_default: true,
          },
          {
            id: "dfaf0615-fc44-44ce-94bd-8c73fd8c1643",
            kind: "student",
            created_by: "current-user",
            is_default: false,
          },
          {
            id: ownedDefault,
            kind: "student",
            created_by: "current-user",
            is_default: true,
          },
        ],
        "student",
        "current-user"
      )
    ).toBe(ownedDefault);
  });

  it("ignores aliases, malformed rows, and other workspace kinds", () => {
    expect(
      resolveWorkspaceIdForKind(
        [
          { id: "", kind: "personal", is_default: true },
          { id: "personal-workspace", kind: "personal", is_default: true },
          { id: null, kind: "personal", is_default: true },
          {
            id: "c56417df-11a8-4292-9424-21531ac8f1d4",
            kind: "student",
            is_default: true,
          },
        ],
        "personal",
        "current-user"
      )
    ).toBeNull();
  });

  it("falls back to an accessible membership when no owned default exists", () => {
    const sharedWorkspace = "41612ed9-9084-4557-b5bd-81322d419f13";

    expect(
      resolveWorkspaceIdForKind(
        [
          {
            id: sharedWorkspace,
            kind: "personal",
            created_by: "another-user",
            is_default: false,
          },
        ],
        "personal",
        "current-user"
      )
    ).toBe(sharedWorkspace);
  });
});
