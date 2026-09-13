import { supabase } from "@/lib/supabase";

export type TeacherClassSummary = {
  id: string;
  name: string;
  inviteCode: string;
  studentCount: number;
  assignmentCount: number;
  completedProblems: number;
  expectedProblems: number;
  completionRate: number;
};

export type TeacherAssignmentSummary = {
  id: string;
  classId: string;
  className: string;
  title: string;
  description: string | null;
  deadline: string | null;
  createdAt: string | null;
  problemCount: number;
  studentCount: number;
  completedProblems: number;
  expectedProblems: number;
  completionRate: number;
  status: "no_deadline" | "overdue" | "upcoming";
};

export type TeacherStudentSummary = {
  id: string;
  username: string;
  avatarUrl: string | null;
  equippedRewards: unknown;
  classIds: string[];
  classNames: string[];
  assignedProblems: number;
  completedProblems: number;
  completionRate: number;
  lastActivityAt: string | null;
};

export type TeacherActivityItem = {
  id: string;
  studentId: string;
  studentName: string;
  assignmentId: string;
  assignmentTitle: string;
  classId: string;
  className: string;
  createdAt: string | null;
};

export type TeacherWorkspaceData = {
  classes: TeacherClassSummary[];
  assignments: TeacherAssignmentSummary[];
  students: TeacherStudentSummary[];
  activity: TeacherActivityItem[];
  totals: {
    classes: number;
    students: number;
    assignments: number;
    upcomingAssignments: number;
    completionRate: number;
  };
};

type ClassRow = {
  id: string;
  name: string;
  invite_code?: string | null;
};

type MembershipRow = {
  class_id: string;
  user_id: string;
  role?: string | null;
};

type AssignmentRow = {
  id: string;
  class_id: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  created_at?: string | null;
  problem_id?: string | null;
  problem_ids?: unknown;
};

type SubmissionRow = {
  assignment_id: string;
  problem_id: string;
  user_id: string;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  equipped_rewards?: unknown;
};

export type TeacherWorkspaceRows = {
  classes: ClassRow[];
  memberships: MembershipRow[];
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
  profiles: ProfileRow[];
};

function clampRate(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getAssignmentProblemIds(assignment: AssignmentRow) {
  const value = assignment.problem_ids;
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && Boolean(item)
    );
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === "string" && Boolean(item)
        );
      }
    } catch {
      if (value.startsWith("{") && value.endsWith("}")) {
        return value
          .slice(1, -1)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
  }

  return assignment.problem_id ? [assignment.problem_id] : [];
}

export function buildTeacherWorkspaceData(
  rows: TeacherWorkspaceRows,
  now = new Date()
): TeacherWorkspaceData {
  const classById = new Map(rows.classes.map((item) => [item.id, item]));
  const profileById = new Map(rows.profiles.map((item) => [item.id, item]));
  const studentIdsByClass = new Map<string, Set<string>>();

  rows.classes.forEach((classRow) => {
    studentIdsByClass.set(classRow.id, new Set());
  });
  rows.memberships.forEach((membership) => {
    if (membership.role === "teacher" || !classById.has(membership.class_id)) {
      return;
    }
    studentIdsByClass.get(membership.class_id)?.add(membership.user_id);
  });

  const assignmentById = new Map(rows.assignments.map((item) => [item.id, item]));
  const validSubmissions = new Map<string, SubmissionRow>();
  rows.submissions.forEach((submission) => {
    const assignment = assignmentById.get(submission.assignment_id);
    if (!assignment) return;
    if (!studentIdsByClass.get(assignment.class_id)?.has(submission.user_id)) {
      return;
    }
    const problemIds = getAssignmentProblemIds(assignment);
    if (problemIds.length && !problemIds.includes(submission.problem_id)) return;
    validSubmissions.set(
      `${submission.assignment_id}:${submission.user_id}:${submission.problem_id}`,
      submission
    );
  });

  const assignments = rows.assignments
    .filter((assignment) => classById.has(assignment.class_id))
    .map<TeacherAssignmentSummary>((assignment) => {
      const problemIds = getAssignmentProblemIds(assignment);
      const studentCount = studentIdsByClass.get(assignment.class_id)?.size || 0;
      const expectedProblems = problemIds.length * studentCount;
      const completedProblems = Array.from(validSubmissions.values()).filter(
        (submission) => submission.assignment_id === assignment.id
      ).length;
      const deadline = assignment.deadline || null;

      return {
        id: assignment.id,
        classId: assignment.class_id,
        className: classById.get(assignment.class_id)?.name || "Class",
        title: assignment.title,
        description: assignment.description || null,
        deadline,
        createdAt: assignment.created_at || null,
        problemCount: problemIds.length,
        studentCount,
        completedProblems,
        expectedProblems,
        completionRate: expectedProblems
          ? clampRate((completedProblems / expectedProblems) * 100)
          : 0,
        status: !deadline
          ? "no_deadline"
          : new Date(deadline) < now
            ? "overdue"
            : "upcoming",
      };
    })
    .sort((left, right) => {
      if (!left.deadline) return 1;
      if (!right.deadline) return -1;
      return new Date(left.deadline).getTime() - new Date(right.deadline).getTime();
    });

  const studentMemberships = new Map<string, Set<string>>();
  studentIdsByClass.forEach((studentIds, classId) => {
    studentIds.forEach((studentId) => {
      const classIds = studentMemberships.get(studentId) || new Set<string>();
      classIds.add(classId);
      studentMemberships.set(studentId, classIds);
    });
  });

  const students = Array.from(studentMemberships.entries())
    .map<TeacherStudentSummary>(([studentId, classIdsSet]) => {
      const classIds = Array.from(classIdsSet);
      const studentAssignments = rows.assignments.filter((assignment) =>
        classIdsSet.has(assignment.class_id)
      );
      const assignedProblems = studentAssignments.reduce(
        (total, assignment) => total + getAssignmentProblemIds(assignment).length,
        0
      );
      const submissions = Array.from(validSubmissions.values()).filter(
        (submission) => submission.user_id === studentId
      );
      const lastActivityAt = submissions
        .map((submission) => submission.created_at || null)
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => Date.parse(right) - Date.parse(left))[0] || null;
      const profile = profileById.get(studentId);

      return {
        id: studentId,
        username: profile?.username || "Student",
        avatarUrl: profile?.avatar_url || null,
        equippedRewards: profile?.equipped_rewards ?? null,
        classIds,
        classNames: classIds.map(
          (classId) => classById.get(classId)?.name || "Class"
        ),
        assignedProblems,
        completedProblems: submissions.length,
        completionRate: assignedProblems
          ? clampRate((submissions.length / assignedProblems) * 100)
          : 0,
        lastActivityAt,
      };
    })
    .sort(
      (left, right) =>
        right.completionRate - left.completionRate ||
        left.username.localeCompare(right.username)
    );

  const classes = rows.classes
    .map<TeacherClassSummary>((classRow) => {
      const classAssignments = assignments.filter(
        (assignment) => assignment.classId === classRow.id
      );
      const completedProblems = classAssignments.reduce(
        (total, assignment) => total + assignment.completedProblems,
        0
      );
      const expectedProblems = classAssignments.reduce(
        (total, assignment) => total + assignment.expectedProblems,
        0
      );

      return {
        id: classRow.id,
        name: classRow.name,
        inviteCode: classRow.invite_code || "",
        studentCount: studentIdsByClass.get(classRow.id)?.size || 0,
        assignmentCount: classAssignments.length,
        completedProblems,
        expectedProblems,
        completionRate: expectedProblems
          ? clampRate((completedProblems / expectedProblems) * 100)
          : 0,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const activity = Array.from(validSubmissions.values())
    .map<TeacherActivityItem>((submission) => {
      const assignment = assignmentById.get(submission.assignment_id)!;
      return {
        id: `${submission.assignment_id}:${submission.user_id}:${submission.problem_id}`,
        studentId: submission.user_id,
        studentName: profileById.get(submission.user_id)?.username || "Student",
        assignmentId: submission.assignment_id,
        assignmentTitle: assignment.title,
        classId: assignment.class_id,
        className: classById.get(assignment.class_id)?.name || "Class",
        createdAt: submission.created_at || null,
      };
    })
    .sort(
      (left, right) =>
        Date.parse(right.createdAt || "1970-01-01") -
        Date.parse(left.createdAt || "1970-01-01")
    )
    .slice(0, 24);

  const totalCompleted = assignments.reduce(
    (total, assignment) => total + assignment.completedProblems,
    0
  );
  const totalExpected = assignments.reduce(
    (total, assignment) => total + assignment.expectedProblems,
    0
  );

  return {
    classes,
    assignments,
    students,
    activity,
    totals: {
      classes: classes.length,
      students: students.length,
      assignments: assignments.length,
      upcomingAssignments: assignments.filter(
        (assignment) => assignment.status === "upcoming"
      ).length,
      completionRate: totalExpected
        ? clampRate((totalCompleted / totalExpected) * 100)
        : 0,
    },
  };
}

export async function loadTeacherWorkspaceData(
  userId: string
): Promise<TeacherWorkspaceData> {
  const classesResult = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", userId)
    .order("created_at", { ascending: false });
  if (classesResult.error) throw classesResult.error;

  const classes = (classesResult.data || []) as ClassRow[];
  const classIds = classes.map((classRow) => classRow.id);
  if (!classIds.length) {
    return buildTeacherWorkspaceData({
      classes: [],
      memberships: [],
      assignments: [],
      submissions: [],
      profiles: [],
    });
  }

  const [membershipsResult, assignmentsResult] = await Promise.all([
    supabase.from("class_members").select("*").in("class_id", classIds),
    supabase.from("assignments").select("*").in("class_id", classIds),
  ]);
  if (membershipsResult.error) throw membershipsResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;

  const memberships = (membershipsResult.data || []) as MembershipRow[];
  const assignments = (assignmentsResult.data || []) as AssignmentRow[];
  const studentIds = Array.from(
    new Set(
      memberships
        .filter((membership) => membership.role !== "teacher")
        .map((membership) => membership.user_id)
    )
  );
  const assignmentIds = assignments.map((assignment) => assignment.id);

  const [profilesResult, submissionsResult] = await Promise.all([
    studentIds.length
      ? supabase.from("profiles").select("*").in("id", studentIds)
      : Promise.resolve({ data: [], error: null }),
    assignmentIds.length
      ? supabase
          .from("assignment_problem_submissions")
          .select("*")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (submissionsResult.error) throw submissionsResult.error;

  return buildTeacherWorkspaceData({
    classes,
    memberships,
    assignments,
    profiles: (profilesResult.data || []) as ProfileRow[],
    submissions: (submissionsResult.data || []) as SubmissionRow[],
  });
}
