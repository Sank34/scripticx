import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Teacher Workspace",
  description: "A preview of the upcoming ScripticX workspace for teachers.",
  path: "/workspace/teacher",
  noIndex: true,
});

export default function TeacherWorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
