import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { buildTeacherWorkspaceData } from "./teacher-workspace";

describe("teacher workspace data", () => {
  it("aggregates classes, unique students and assignment completion", () => {
    const data = buildTeacherWorkspaceData(
      {
        classes: [{ id: "class-1", name: "10A", invite_code: "ABC123" }],
        memberships: [
          { class_id: "class-1", user_id: "teacher", role: "teacher" },
          { class_id: "class-1", user_id: "student-1", role: "student" },
          { class_id: "class-1", user_id: "student-2", role: "student" },
        ],
        assignments: [
          {
            id: "assignment-1",
            class_id: "class-1",
            title: "Loops",
            deadline: "2026-09-01T10:00:00.000Z",
            problem_ids: ["p1", "p2"],
          },
        ],
        submissions: [
          {
            assignment_id: "assignment-1",
            problem_id: "p1",
            user_id: "student-1",
            created_at: "2026-08-22T10:00:00.000Z",
          },
          {
            assignment_id: "assignment-1",
            problem_id: "p2",
            user_id: "student-1",
            created_at: "2026-08-22T11:00:00.000Z",
          },
        ],
        profiles: [
          { id: "student-1", username: "Ana" },
          { id: "student-2", username: "Mihai" },
        ],
      },
      new Date("2026-08-23T10:00:00.000Z")
    );

    expect(data.totals).toEqual({
      classes: 1,
      students: 2,
      assignments: 1,
      upcomingAssignments: 1,
      completionRate: 50,
    });
    expect(data.classes[0]).toMatchObject({
      studentCount: 2,
      completionRate: 50,
    });
    expect(data.students.map((student) => student.completionRate)).toEqual([
      100, 0,
    ]);
  });

  it("ignores submissions from users outside the teacher class", () => {
    const data = buildTeacherWorkspaceData({
      classes: [{ id: "class-1", name: "10A" }],
      memberships: [
        { class_id: "class-1", user_id: "student-1", role: "student" },
      ],
      assignments: [
        {
          id: "assignment-1",
          class_id: "class-1",
          title: "Arrays",
          problem_id: "p1",
        },
      ],
      submissions: [
        {
          assignment_id: "assignment-1",
          problem_id: "p1",
          user_id: "outsider",
        },
      ],
      profiles: [],
    });

    expect(data.assignments[0].completedProblems).toBe(0);
  });
});
