import type { Metadata } from "next";

import { DocsShell } from "@/components/docs/DocsShell";
import { createPageMetadata } from "@/lib/metadata";
import { getExamplesNavigation } from "@/lib/server/docs";

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
  return (
    <DocsShell
      collection="examples"
      navigation={{
        en: getExamplesNavigation("en"),
        ro: getExamplesNavigation("ro"),
      }}
    >
      {children}
    </DocsShell>
  );
}
