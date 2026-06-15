import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Basic MiniScript+ Examples",
  description:
    "Run simple MiniScript+ examples covering output, assignments, and first programs.",
  path: "/examples/basics",
});

export default function BasicsExamplesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
