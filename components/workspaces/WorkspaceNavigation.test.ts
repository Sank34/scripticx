import { describe, expect, it } from "vitest";

import {
  getTeacherWorkspaceNavigation,
  getStudentStudyNavigation,
  getStudentWorkspaceNavigation,
  isStudentWorkspaceContext,
  isTeacherWorkspaceContext,
} from "@/components/workspaces/WorkspaceNavigation";
import { workspaceMetadataKeys } from "@/lib/workspaces";

const studentMetadata = {
  [workspaceMetadataKeys.activeWorkspaceKind]: "student",
};
const teacherMetadata = {
  [workspaceMetadataKeys.activeWorkspaceKind]: "teacher",
};
const studentPersonaMetadata = {
  [workspaceMetadataKeys.persona]: "student",
};
const teacherPersonaMetadata = {
  [workspaceMetadataKeys.persona]: "teacher",
};

describe("student workspace navigation", () => {
  it("keeps workspace routes in student context without relying on metadata", () => {
    expect(isStudentWorkspaceContext("/workspace/student", undefined)).toBe(true);
    expect(
      isStudentWorkspaceContext("/workspace/student/notes/note-1", undefined)
    ).toBe(true);
  });

  it("keeps only student study surfaces contextual on shared routes", () => {
    for (const pathname of [
      "/editor",
      "/editor/project-1",
      "/learn/lesson/arrays",
      "/problems/42",
      "/classes/class-1",
    ]) {
      expect(isStudentWorkspaceContext(pathname, studentMetadata)).toBe(true);
    }

    expect(isStudentWorkspaceContext("/dashboard", studentMetadata)).toBe(false);
    expect(isStudentWorkspaceContext("/feed", studentMetadata)).toBe(false);
    expect(isStudentWorkspaceContext("/admin", studentMetadata)).toBe(false);
  });

  it("always places classes in the student workspace for student accounts", () => {
    expect(
      isStudentWorkspaceContext("/classes/class-1", studentPersonaMetadata)
    ).toBe(true);
    expect(isStudentWorkspaceContext("/editor", studentPersonaMetadata)).toBe(
      false
    );
  });

  it("marks the notes section active for both the library and documents", () => {
    const notes = getStudentWorkspaceNavigation("ro").find(
      (item) => item.href === "/workspace/student/notes"
    );

    expect(notes?.active("/workspace/student/notes")).toBe(true);
    expect(notes?.active("/workspace/student/notes/note-1")).toBe(true);
    expect(notes?.active("/workspace/student/whiteboard")).toBe(false);
  });

  it("limits the study group to student learning workflows", () => {
    expect(getStudentStudyNavigation("en").map((item) => item.href)).toEqual([
      "/editor",
      "/learn",
      "/problems",
      "/classes",
    ]);
  });
});

describe("teacher workspace navigation", () => {
  it("keeps dedicated pages and class details in teacher context", () => {
    expect(isTeacherWorkspaceContext("/workspace/teacher/students")).toBe(true);
    expect(isTeacherWorkspaceContext("/classes/class-1", teacherMetadata)).toBe(
      true
    );
    expect(isTeacherWorkspaceContext("/problems/1", teacherMetadata)).toBe(
      false
    );
  });

  it("always places classes in the teacher workspace for teacher accounts", () => {
    expect(
      isTeacherWorkspaceContext("/classes/class-1", teacherPersonaMetadata)
    ).toBe(true);
  });

  it("provides dedicated management routes", () => {
    expect(getTeacherWorkspaceNavigation("en").map((item) => item.href)).toEqual([
      "/workspace/teacher",
      "/workspace/teacher/classes",
      "/workspace/teacher/students",
      "/workspace/teacher/assignments",
      "/workspace/teacher/calendar",
      "/workspace/teacher/analytics",
    ]);
  });
});
