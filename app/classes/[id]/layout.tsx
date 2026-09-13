import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Class",
  description: "Assignments, members, and learning activity for a ScripticX class.",
  path: "/classes",
  noIndex: true,
});

export default function ClassLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
