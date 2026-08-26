import type { Metadata } from "next";

import { DocsShell } from "@/components/docs/DocsShell";
import { createPageMetadata } from "@/lib/metadata";
import { getDocsNavigation } from "@/lib/server/docs";

export const metadata: Metadata = createPageMetadata({
  title: "MiniScript+ Documentation",
  description:
    "Learn MiniScript+ syntax, variables, conditions, loops, and input-output operations through practical explanations and examples.",
  path: "/docs/basics",
  keywords: [
    "MiniScript+ documentation",
    "beginner programming tutorial",
    "MiniScript+ syntax",
  ],
});

export default function DocsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <DocsShell
      navigation={{
        en: getDocsNavigation("en"),
        ro: getDocsNavigation("ro"),
      }}
    >
      {children}
    </DocsShell>
  );
}
