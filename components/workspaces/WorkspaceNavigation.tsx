import {
  Code2,
  FileText,
  Home,
  ListChecks,
  Network,
  PenTool,
  Route,
  School,
  type LucideIcon,
} from "lucide-react";

import {
  getWorkspaceKindFromMetadata,
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

export function isStudentWorkspaceContext(
  pathname: string,
  metadata?: Record<string, unknown>
) {
  if (pathname.startsWith(studentWorkspaceRoot)) return true;
  if (getWorkspaceKindFromMetadata(metadata) !== "student") return false;

  return studentSharedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
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
      icon: Code2,
      label: ro ? "Editor de cod" : "Code editor",
      active: (pathname) => pathname.startsWith("/editor"),
    },
    {
      href: "/learn",
      icon: Route,
      label: ro ? "Parcurs de învățare" : "Learning path",
      active: (pathname) =>
        pathname === "/learn" || pathname.startsWith("/learn/lesson"),
    },
    {
      href: "/problems",
      icon: ListChecks,
      label: ro ? "Probleme" : "Problems",
      active: (pathname) => pathname.startsWith("/problems"),
    },
    {
      href: "/classes",
      icon: School,
      label: ro ? "Clasele mele" : "My classes",
      active: (pathname) => pathname.startsWith("/classes"),
    },
  ];
}
