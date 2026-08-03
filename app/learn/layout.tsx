import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Learning Roadmap",
  description:
    "Follow the ScripticX learning roadmap with guided lessons, interactive MiniScript+ examples, quick quizzes, and recommended problems.",
  path: "/learn",
  keywords: [
    "MiniScript+ roadmap",
    "beginner programming tutorial",
    "learn programming",
  ],
});

export default function LearnLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
