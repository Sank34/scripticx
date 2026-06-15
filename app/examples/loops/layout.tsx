import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "MiniScript+ Loop Examples",
  description:
    "Explore practical MiniScript+ examples with WHILE loops, counters, and repetitive processing.",
  path: "/examples/loops",
});

export default function LoopExamplesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
