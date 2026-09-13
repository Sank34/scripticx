import type { Metadata } from "next";

import { WorkspaceCloudSync } from "@/components/workspaces/WorkspaceCloudSync";
import { WorkspaceAccessGuard } from "@/components/workspaces/WorkspaceAccessGuard";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Student Workspace",
  description: "Organize Markdown notes, whiteboards and interactive graphs in ScripticX.",
  path: "/workspace/student",
  noIndex: true,
});

export default function StudentWorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <WorkspaceAccessGuard kind="student">
      <WorkspaceCloudSync />
      {children}
    </WorkspaceAccessGuard>
  );
}
