import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Coding Problems",
  description:
    "Solve MiniScript+ problems, validate solutions against test cases, and receive immediate feedback for every attempt.",
  path: "/problems",
});

export default function ProblemsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
