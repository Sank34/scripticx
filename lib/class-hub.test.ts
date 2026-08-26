import { describe, expect, it } from "vitest";

import { buildClassDirectoryData } from "@/lib/class-hub";

describe("buildClassDirectoryData", () => {
  it("calculates student progress only from the signed-in student's submissions", () => {
    const data = buildClassDirectoryData(
      {
        classes: [{ id: "c1", name: "Algorithms", teacher_id: "teacher" }],
        memberships: [
          { class_id: "c1", user_id: "student", role: "student" },
          { class_id: "c1", user_id: "student-2", role: "student" },
        ],
        assignments: [
          { id: "a1", class_id: "c1", title: "Loops", problem_ids: ["p1", "p2"] },
        ],
        submissions: [
          { assignment_id: "a1", problem_id: "p1", user_id: "student" },
          { assignment_id: "a1", problem_id: "p1", user_id: "student-2" },
          { assignment_id: "a1", problem_id: "p2", user_id: "student-2" },
        ],
        profiles: [{ id: "teacher", username: "Ada" }],
        currentUserId: "student",
      },
      new Date("2026-08-25T10:00:00.000Z")
    );

    expect(data.classes[0]).toMatchObject({
      role: "student",
      teacherName: "Ada",
      assignedProblems: 2,
      completedProblems: 1,
      progress: 50,
    });
  });

  it("calculates aggregate progress for teachers", () => {
    const data = buildClassDirectoryData({
      classes: [{ id: "c1", name: "Algorithms", teacher_id: "teacher" }],
      memberships: [
        { class_id: "c1", user_id: "student", role: "student" },
        { class_id: "c1", user_id: "student-2", role: "student" },
      ],
      assignments: [
        { id: "a1", class_id: "c1", title: "Loops", problem_ids: ["p1", "p2"] },
      ],
      submissions: [
        { assignment_id: "a1", problem_id: "p1", user_id: "student" },
        { assignment_id: "a1", problem_id: "p1", user_id: "student-2" },
      ],
      profiles: [],
      currentUserId: "teacher",
    });

    expect(data.classes[0]).toMatchObject({
      role: "teacher",
      assignedProblems: 4,
      completedProblems: 2,
      progress: 50,
      studentCount: 2,
    });
  });
});
