import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "MiniScript+ Fundamentals",
  description:
    "Discover the structure of a MiniScript+ program, its core instructions, and foundational syntax rules.",
  path: "/docs/basics",
});

export default function BasicsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
