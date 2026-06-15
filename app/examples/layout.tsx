import type { Metadata } from "next";

import ExamplesLayoutClient from "@/components/examples/ExamplesLayoutClient";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "MiniScript+ Examples",
  description:
    "Explore runnable MiniScript+ programs covering fundamentals, conditions, loops, and algorithms.",
  path: "/examples",
  keywords: [
    "MiniScript+ examples",
    "beginner programming algorithms",
    "programming code examples",
  ],
});

export default function ExamplesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ExamplesLayoutClient>{children}</ExamplesLayoutClient>;
}
