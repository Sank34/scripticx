import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";
import { WorkspaceAccessGuard } from "@/components/workspaces/WorkspaceAccessGuard";
import RouteGuard from "@/components/RouteGuard";

export const metadata: Metadata = createPageMetadata({
  title: "Teacher Workspace",
  description: "Manage classes, students, assignments and progress in ScripticX.",
  path: "/workspace/teacher",
  noIndex: true,
});

export default function TeacherWorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RouteGuard requireAuth>
      <WorkspaceAccessGuard kind="teacher">{children}</WorkspaceAccessGuard>
    </RouteGuard>
  );
}
