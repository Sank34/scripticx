import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "MiniScript+ Editor",
  description:
    "Write and run MiniScript+ code, follow execution step by step, and analyze program structure and complexity.",
  path: "/editor",
  noIndex: true,
});

export default function EditorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
