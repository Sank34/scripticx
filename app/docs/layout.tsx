import type { Metadata } from "next";

import LearnLayoutClient from "@/components/learn/LearnLayoutClient";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "MiniScript+ Documentation",
  description:
    "Learn MiniScript+ syntax, variables, conditions, loops, and input-output operations through practical explanations and examples.",
  path: "/docs/basics",
  keywords: [
    "MiniScript+ documentation",
    "beginner programming tutorial",
    "MiniScript+ syntax",
  ],
});

export default function DocsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <LearnLayoutClient>{children}</LearnLayoutClient>;
}
