import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "MiniScript+ Condition Examples",
  description:
    "Understand program branching through MiniScript+ examples using IF, ELSE, and logical expressions.",
  path: "/examples/conditions",
});

export default function ConditionExamplesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
