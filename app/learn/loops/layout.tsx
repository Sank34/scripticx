import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Loops in MiniScript+",
  description:
    "Learn how to repeat instructions with WHILE and follow variable changes step by step.",
  path: "/learn/loops",
});

export default function LoopsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
