import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Algorithms in MiniScript+",
  description:
    "Study classic algorithms implemented in MiniScript+ and follow their logic step by step.",
  path: "/examples/algorithms",
});

export default function AlgorithmExamplesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
