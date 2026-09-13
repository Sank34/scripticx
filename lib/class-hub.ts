import type { SupabaseClient } from "@supabase/supabase-js";

export type ClassRole = "admin" | "teacher" | "student";
export type AssignmentStatus = "draft" | "scheduled" | "published" | "closed";

export type ClassRow = {
  id: string;
  name: string;
  teacher_id: string;
  invite_code?: string | null;
  description?: string | null;
  subject?: string | null;
  school_year?: string | null;
  archived_at?: string | null;
  created_at?: string | null;
};

export type MembershipRow = {
  class_id: string;
  user_id: string;
  role?: string | null;
};

export type AssignmentRow = {
  id: string;
  class_id: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  created_at?: string | null;
  problem_id?: string | null;
  problem_ids?: unknown;
  status?: AssignmentStatus | null;
  available_at?: string | null;
  allow_late?: boolean | null;
  max_attempts?: number | null;
  points?: number | null;
};

export type SubmissionRow = {
  assignment_id: string;
  problem_id: string;
  user_id: string;
  created_at?: string | null;
};

export type ProfileRow = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  equipped_rewards?: unknown;
};

export type ClassAnnouncement = {
  id: string;
  class_id: string;
  author_id: string;
  title: string;
  body: string;
  status: "draft" | "scheduled" | "published";
  pinned: boolean;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
};

export type ClassResource = {
  id: string;
  class_id: string;
  created_by: string;
  title: string;
  description: string | null;
  resource_type: "link" | "document" | "note" | "whiteboard" | "file";
  url: string | null;
  linked_entity_id: string | null;
  created_at: string;
};

export type ClassEvent = {
  id: string;
  class_id: string;
  created_by: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  event_type: "event" | "lesson" | "test" | "project" | "office_hours";
  linked_assignment_id: string | null;
};

export type ClassDirectoryItem = {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  schoolYear: string | null;
  role: ClassRole;
  teacherName: string;
  studentCount: number;
  assignmentCount: number;
  activeAssignmentCount: number;
  overdueAssignmentCount: number;
  nextDeadline: string | null;
  completedProblems: number;
  assignedProblems: number;
  progress: number;
  archived: boolean;
};

export type ClassDirectoryData = {
  classes: ClassDirectoryItem[];
  totals: {
    activeClasses: number;
    upcomingAssignments: number;
    overdueAssignments: number;
    averageProgress: number;
  };
};

export type ClassMember = ProfileRow & {
  role: ClassRole;
  completedProblems: number;
  assignedProblems: number;
  progress: number;
  lastActivityAt: string | null;
};

export type ClassAssignment = AssignmentRow & {
  problemCount: number;
  completedProblems: number;
  expectedProblems: number;
  completionRate: number;
  timing: "draft" | "scheduled" | "active" | "overdue" | "closed" | "no_deadline";
};

export type ClassHubData = {
  classInfo: ClassRow;
  role: ClassRole;
  canManage: boolean;
  members: ClassMember[];
  assignments: ClassAssignment[];
  announcements: ClassAnnouncement[];
  resources: ClassResource[];
  events: ClassEvent[];
  totals: {
    students: number;
    assignments: number;
    upcomingAssignments: number;
    completionRate: number;
  };
};

type BuildInput = {
  classes: ClassRow[];
  memberships: MembershipRow[];
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
  profiles: ProfileRow[];
  currentUserId: string;
  isAdmin?: boolean;
};

const clampRate = (value: number) =>
  Math.min(100, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));

export function getClassAssignmentProblemIds(assignment: AssignmentRow) {
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
        return value.slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean);
      }
    }
  }
  return assignment.problem_id ? [assignment.problem_id] : [];
}

function assignmentStatus(assignment: AssignmentRow, now: Date) {
  const status = assignment.status || "published";
  if (status === "draft") return "draft" as const;
  if (status === "closed") return "closed" as const;
  if (assignment.available_at && new Date(assignment.available_at) > now) {
    return "scheduled" as const;
  }
  if (!assignment.deadline) return "no_deadline" as const;
  return new Date(assignment.deadline) < now
    ? ("overdue" as const)
    : ("active" as const);
}

function uniqueSubmissions(rows: SubmissionRow[]) {
  return new Map(
    rows.map((row) => [
      `${row.assignment_id}:${row.user_id}:${row.problem_id}`,
      row,
    ])
  );
}

export function buildClassDirectoryData(
  input: BuildInput,
  now = new Date()
): ClassDirectoryData {
  const membershipsByClass = new Map<string, MembershipRow[]>();
  input.memberships.forEach((membership) => {
    const rows = membershipsByClass.get(membership.class_id) || [];
    rows.push(membership);
    membershipsByClass.set(membership.class_id, rows);
  });
  const profileById = new Map(input.profiles.map((profile) => [profile.id, profile]));
  const submissions = uniqueSubmissions(input.submissions);

  const classes = input.classes.map<ClassDirectoryItem>((classRow) => {
    const memberships = membershipsByClass.get(classRow.id) || [];
    const ownMembership = memberships.find(
      (membership) => membership.user_id === input.currentUserId
    );
    const role: ClassRole = input.isAdmin
      ? "admin"
      : classRow.teacher_id === input.currentUserId || ownMembership?.role === "teacher"
        ? "teacher"
        : "student";
    const classAssignments = input.assignments.filter(
      (assignment) => assignment.class_id === classRow.id
    );
    const studentIds = new Set(
      memberships
        .filter((membership) => membership.role !== "teacher")
        .map((membership) => membership.user_id)
    );
    const relevantStudentIds = role === "student"
      ? new Set([input.currentUserId])
      : studentIds;
    const assignedProblems = classAssignments.reduce(
      (total, assignment) =>
        total + getClassAssignmentProblemIds(assignment).length * relevantStudentIds.size,
      0
    );
    const completedProblems = Array.from(submissions.values()).filter((submission) =>
      classAssignments.some((assignment) => assignment.id === submission.assignment_id) &&
      relevantStudentIds.has(submission.user_id)
    ).length;
    const nextDeadline = classAssignments
      .map((assignment) => assignment.deadline || null)
      .filter(
        (deadline): deadline is string =>
          typeof deadline === "string" && new Date(deadline) >= now
      )
      .sort((left, right) => Date.parse(left) - Date.parse(right))[0] || null;

    return {
      id: classRow.id,
      name: classRow.name,
      description: classRow.description || null,
      subject: classRow.subject || null,
      schoolYear: classRow.school_year || null,
      role,
      teacherName: profileById.get(classRow.teacher_id)?.username || "Teacher",
      studentCount: studentIds.size,
      assignmentCount: classAssignments.length,
      activeAssignmentCount: classAssignments.filter(
        (assignment) => assignmentStatus(assignment, now) === "active"
      ).length,
      overdueAssignmentCount: classAssignments.filter(
        (assignment) => assignmentStatus(assignment, now) === "overdue"
      ).length,
      nextDeadline,
      completedProblems,
      assignedProblems,
      progress: assignedProblems ? clampRate((completedProblems / assignedProblems) * 100) : 0,
      archived: Boolean(classRow.archived_at),
    };
  });

  const activeClasses = classes.filter((classItem) => !classItem.archived);
  return {
    classes,
    totals: {
      activeClasses: activeClasses.length,
      upcomingAssignments: activeClasses.reduce(
        (total, classItem) => total + classItem.activeAssignmentCount,
        0
      ),
      overdueAssignments: activeClasses.reduce(
        (total, classItem) => total + classItem.overdueAssignmentCount,
        0
      ),
      averageProgress: activeClasses.length
        ? clampRate(
            activeClasses.reduce((total, classItem) => total + classItem.progress, 0) /
              activeClasses.length
          )
        : 0,
    },
  };
}

async function optionalRows<T>(promise: PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>) {
  const result = await promise;
  if (result.error) {
    if (["42P01", "42703", "PGRST204", "PGRST205"].includes(result.error.code || "")) return [];
    throw result.error;
  }
  return (result.data || []) as T[];
}

export async function loadClassDirectory(
  client: SupabaseClient,
  input: { userId: string; isAdmin?: boolean }
) {
  const membershipsResult = input.isAdmin
    ? await client.from("class_members").select("class_id,user_id,role")
    : await client
        .from("class_members")
        .select("class_id,user_id,role")
        .eq("user_id", input.userId);
  if (membershipsResult.error) throw membershipsResult.error;

  const ownMemberships = (membershipsResult.data || []) as MembershipRow[];
  let classesQuery = client.from("classes").select("*").order("created_at", { ascending: false });
  if (!input.isAdmin) {
    const classIds = ownMemberships.map((membership) => membership.class_id);
    const filter = [`teacher_id.eq.${input.userId}`];
    if (classIds.length) filter.push(`id.in.(${classIds.join(",")})`);
    classesQuery = classesQuery.or(filter.join(","));
  }
  const classesResult = await classesQuery;
  if (classesResult.error) throw classesResult.error;
  const classes = (classesResult.data || []) as ClassRow[];
  const classIds = classes.map((row) => row.id);
  if (!classIds.length) {
    return buildClassDirectoryData({
      classes: [], memberships: [], assignments: [], submissions: [], profiles: [],
      currentUserId: input.userId, isAdmin: input.isAdmin,
    });
  }

  const [membersResult, assignmentsResult] = await Promise.all([
    client.from("class_members").select("class_id,user_id,role").in("class_id", classIds),
    client.from("assignments").select("*").in("class_id", classIds),
  ]);
  if (membersResult.error) throw membersResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;
  const memberships = (membersResult.data || []) as MembershipRow[];
  const assignments = (assignmentsResult.data || []) as AssignmentRow[];
  const assignmentIds = assignments.map((row) => row.id);
  const teacherIds = Array.from(new Set(classes.map((row) => row.teacher_id)));
  const [profilesResult, submissionsResult] = await Promise.all([
    client.from("profiles").select("id,username,avatar_url,equipped_rewards").in("id", teacherIds),
    assignmentIds.length
      ? (input.isAdmin || classes.some((row) => row.teacher_id === input.userId)
          ? client.from("assignment_problem_submissions").select("assignment_id,problem_id,user_id,created_at").in("assignment_id", assignmentIds)
          : client.from("assignment_problem_submissions").select("assignment_id,problem_id,user_id,created_at").eq("user_id", input.userId).in("assignment_id", assignmentIds))
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (submissionsResult.error) throw submissionsResult.error;

  return buildClassDirectoryData({
    classes,
    memberships,
    assignments,
    submissions: (submissionsResult.data || []) as SubmissionRow[],
    profiles: (profilesResult.data || []) as ProfileRow[],
    currentUserId: input.userId,
    isAdmin: input.isAdmin,
  });
}

export async function loadClassHub(
  client: SupabaseClient,
  input: { classId: string; userId: string; isAdmin?: boolean }
): Promise<ClassHubData> {
  const lookupColumn = /^[0-9a-fA-F-]{36}$/.test(input.classId) ? "id" : "invite_code";
  const classResult = await client.from("classes").select("*").eq(lookupColumn, input.classId).maybeSingle();
  if (classResult.error) throw classResult.error;
  if (!classResult.data) throw new Error("Class not found.");
  const classInfo = classResult.data as ClassRow;

  const membershipResult = await client
    .from("class_members")
    .select("class_id,user_id,role")
    .eq("class_id", classInfo.id);
  if (membershipResult.error) throw membershipResult.error;
  const memberships = (membershipResult.data || []) as MembershipRow[];
  const ownMembership = memberships.find((row) => row.user_id === input.userId);
  const role: ClassRole = input.isAdmin
    ? "admin"
    : classInfo.teacher_id === input.userId || ownMembership?.role === "teacher"
      ? "teacher"
      : "student";
  const canManage = role === "teacher" || role === "admin";
  if (!canManage && !ownMembership) throw new Error("You do not have access to this class.");

  const assignmentsResult = await client
    .from("assignments")
    .select("*")
    .eq("class_id", classInfo.id)
    .order("created_at", { ascending: false });
  if (assignmentsResult.error) throw assignmentsResult.error;
  const assignmentRows = (assignmentsResult.data || []) as AssignmentRow[];
  const assignmentIds = assignmentRows.map((row) => row.id);
  const profileIds = Array.from(new Set([...memberships.map((row) => row.user_id), classInfo.teacher_id]));

  const [profilesResult, submissionsResult, announcements, resources, events] = await Promise.all([
    client.from("profiles").select("id,username,avatar_url,equipped_rewards").in("id", profileIds),
    assignmentIds.length
      ? (canManage
          ? client.from("assignment_problem_submissions").select("assignment_id,problem_id,user_id,created_at").in("assignment_id", assignmentIds)
          : client.from("assignment_problem_submissions").select("assignment_id,problem_id,user_id,created_at").eq("user_id", input.userId).in("assignment_id", assignmentIds))
      : Promise.resolve({ data: [], error: null }),
    optionalRows<ClassAnnouncement>(client.from("class_announcements").select("*").eq("class_id", classInfo.id).order("pinned", { ascending: false }).order("created_at", { ascending: false })),
    optionalRows<ClassResource>(client.from("class_resources").select("*").eq("class_id", classInfo.id).order("created_at", { ascending: false })),
    optionalRows<ClassEvent>(client.from("class_events").select("*").eq("class_id", classInfo.id).order("starts_at", { ascending: true })),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (submissionsResult.error) throw submissionsResult.error;
  const profiles = (profilesResult.data || []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const submissions = Array.from(uniqueSubmissions((submissionsResult.data || []) as SubmissionRow[]).values());
  const studentMemberships = memberships.filter((row) => row.role !== "teacher");
  const studentIds = new Set(studentMemberships.map((row) => row.user_id));
  const visibleStudentIds = canManage ? studentIds : new Set([input.userId]);

  const assignments = assignmentRows.map<ClassAssignment>((assignment) => {
    const problemIds = getClassAssignmentProblemIds(assignment);
    const expectedProblems = problemIds.length * visibleStudentIds.size;
    const completedProblems = submissions.filter(
      (submission) => submission.assignment_id === assignment.id && visibleStudentIds.has(submission.user_id)
    ).length;
    return {
      ...assignment,
      problemCount: problemIds.length,
      completedProblems,
      expectedProblems,
      completionRate: expectedProblems ? clampRate((completedProblems / expectedProblems) * 100) : 0,
      timing: assignmentStatus(assignment, new Date()),
    };
  });

  const members = memberships.map<ClassMember>((membership) => {
    const memberAssignments = assignmentRows;
    const assignedProblems = memberAssignments.reduce(
      (total, assignment) => total + getClassAssignmentProblemIds(assignment).length,
      0
    );
    const memberSubmissions = submissions.filter((submission) => submission.user_id === membership.user_id);
    const lastActivityAt = memberSubmissions
      .map((submission) => submission.created_at || null)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] || null;
    const profile = profileById.get(membership.user_id);
    return {
      id: membership.user_id,
      username: profile?.username || (membership.role === "teacher" ? "Teacher" : "Student"),
      avatar_url: profile?.avatar_url || null,
      equipped_rewards: profile?.equipped_rewards,
      role: membership.role === "teacher" ? "teacher" : "student",
      completedProblems: memberSubmissions.length,
      assignedProblems,
      progress: assignedProblems ? clampRate((memberSubmissions.length / assignedProblems) * 100) : 0,
      lastActivityAt,
    };
  });

  const totalExpected = assignments.reduce((total, assignment) => total + assignment.expectedProblems, 0);
  const totalCompleted = assignments.reduce((total, assignment) => total + assignment.completedProblems, 0);
  return {
    classInfo,
    role,
    canManage,
    members,
    assignments,
    announcements,
    resources,
    events,
    totals: {
      students: studentIds.size,
      assignments: assignments.length,
      upcomingAssignments: assignments.filter((assignment) => assignment.timing === "active" || assignment.timing === "scheduled").length,
      completionRate: totalExpected ? clampRate((totalCompleted / totalExpected) * 100) : 0,
    },
  };
}
