import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Help",
  description:
    "Find answers and guidance for using the ScripticX editor, coding problems, and platform features.",
  path: "/help",
});

export default function HelpLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
