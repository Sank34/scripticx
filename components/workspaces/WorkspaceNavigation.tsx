import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Code2,
  FileText,
  Home,
  ListChecks,
  Network,
  PenTool,
  Route,
  School,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import {
  getWorkspaceKindFromMetadata,
  getWorkspacePersonaFromMetadata,
  workspaceDefinitions,
} from "@/lib/workspaces";

export type WorkspaceNavigationItem = {
  active: (pathname: string) => boolean;
  href: string;
  icon: LucideIcon;
  label: string;
};

const studentWorkspaceRoot = workspaceDefinitions.student.route;
const studentSharedRoutes = ["/editor", "/learn", "/problems", "/classes"];
const teacherWorkspaceRoot = workspaceDefinitions.teacher.route;
const teacherSharedRoutes = ["/classes"];

export const sharedStudyNavigationIcons = {
  editor: Code2,
  learn: Route,
  problems: ListChecks,
  classes: School,
} as const;

export function isStudentWorkspaceContext(
  pathname: string,
  metadata?: Record<string, unknown>
) {
  if (pathname.startsWith(studentWorkspaceRoot)) return true;
  if (
    pathname.startsWith("/classes") &&
    getWorkspacePersonaFromMetadata(metadata) === "student"
  ) {
    return true;
  }
  if (getWorkspaceKindFromMetadata(metadata) !== "student") return false;

  return studentSharedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isTeacherWorkspaceContext(
  pathname: string,
  metadata?: Record<string, unknown>
) {
  if (pathname.startsWith(teacherWorkspaceRoot)) return true;
  if (
    pathname.startsWith("/classes") &&
    getWorkspacePersonaFromMetadata(metadata) === "teacher"
  ) {
    return true;
  }
  if (getWorkspaceKindFromMetadata(metadata) !== "teacher") return false;

  return teacherSharedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function getTeacherWorkspaceNavigation(
  locale: string
): WorkspaceNavigationItem[] {
  const ro = locale === "ro";

  return [
    {
      href: teacherWorkspaceRoot,
      icon: Home,
      label: "Dashboard",
      active: (pathname) =>
        pathname === teacherWorkspaceRoot ||
        pathname === `${teacherWorkspaceRoot}/`,
    },
    {
      href: `${teacherWorkspaceRoot}/classes`,
      icon: School,
      label: ro ? "Clase" : "Classes",
      active: (pathname) =>
        pathname.startsWith(`${teacherWorkspaceRoot}/classes`) ||
        pathname.startsWith("/classes"),
    },
    {
      href: `${teacherWorkspaceRoot}/students`,
      icon: UsersRound,
      label: ro ? "Elevi" : "Students",
      active: (pathname) =>
        pathname.startsWith(`${teacherWorkspaceRoot}/students`),
    },
    {
      href: `${teacherWorkspaceRoot}/assignments`,
      icon: ClipboardList,
      label: ro ? "Teme și teste" : "Assignments & tests",
      active: (pathname) =>
        pathname.startsWith(`${teacherWorkspaceRoot}/assignments`),
    },
    {
      href: `${teacherWorkspaceRoot}/calendar`,
      icon: CalendarDays,
      label: ro ? "Calendar" : "Calendar",
      active: (pathname) =>
        pathname.startsWith(`${teacherWorkspaceRoot}/calendar`),
    },
    {
      href: `${teacherWorkspaceRoot}/analytics`,
      icon: BarChart3,
      label: ro ? "Analiză" : "Analytics",
      active: (pathname) =>
        pathname.startsWith(`${teacherWorkspaceRoot}/analytics`),
    },
  ];
}

export function getStudentWorkspaceNavigation(
  locale: string
): WorkspaceNavigationItem[] {
  const ro = locale === "ro";

  return [
    {
      href: studentWorkspaceRoot,
      icon: Home,
      label: ro ? "Acasă" : "Home",
      active: (pathname) =>
        pathname === studentWorkspaceRoot ||
        pathname === `${studentWorkspaceRoot}/`,
    },
    {
      href: `${studentWorkspaceRoot}/calendar`,
      icon: CalendarDays,
      label: ro ? "Planner" : "Planner",
      active: (pathname) =>
        pathname.startsWith(`${studentWorkspaceRoot}/calendar`),
    },
    {
      href: `${studentWorkspaceRoot}/notes`,
      icon: FileText,
      label: ro ? "Notițe" : "Notes",
      active: (pathname) =>
        pathname.startsWith(`${studentWorkspaceRoot}/notes`),
    },
    {
      href: `${studentWorkspaceRoot}/whiteboard`,
      icon: PenTool,
      label: "Whiteboard",
      active: (pathname) =>
        pathname.startsWith(`${studentWorkspaceRoot}/whiteboard`),
    },
    {
      href: `${studentWorkspaceRoot}/graph`,
      icon: Network,
      label: ro ? "Grafuri" : "Graphs",
      active: (pathname) =>
        pathname.startsWith(`${studentWorkspaceRoot}/graph`),
    },
  ];
}

export function getStudentStudyNavigation(
  locale: string
): WorkspaceNavigationItem[] {
  const ro = locale === "ro";

  return [
    {
      href: "/editor",
      icon: sharedStudyNavigationIcons.editor,
      label: ro ? "Editor de cod" : "Code editor",
      active: (pathname) => pathname.startsWith("/editor"),
    },
    {
      href: "/learn",
      icon: sharedStudyNavigationIcons.learn,
      label: ro ? "Parcurs de învățare" : "Learning path",
      active: (pathname) =>
        pathname === "/learn" || pathname.startsWith("/learn/"),
    },
    {
      href: "/problems",
      icon: sharedStudyNavigationIcons.problems,
      label: ro ? "Probleme" : "Problems",
      active: (pathname) => pathname.startsWith("/problems"),
    },
    {
      href: "/classes",
      icon: sharedStudyNavigationIcons.classes,
      label: ro ? "Clasele mele" : "My classes",
      active: (pathname) => pathname.startsWith("/classes"),
    },
  ];
}
