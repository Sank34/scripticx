import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Variables in MiniScript+",
  description:
    "Learn how variables and values are declared, updated, and used in MiniScript+ programs.",
  path: "/docs/variables",
});

export default function VariablesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
