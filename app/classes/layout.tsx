import type { Metadata } from "next";

import { ClassesAccessGuard } from "@/app/classes/ClassesAccessGuard";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Classes",
  description:
    "Organize classes, assignments, and learning progress in a dedicated ScripticX workspace.",
  path: "/classes",
  noIndex: true,
});

export default function ClassesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ClassesAccessGuard>{children}</ClassesAccessGuard>;
}
