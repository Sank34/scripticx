import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Exemple cu condiții MiniScript+",
  description:
    "Înțelege ramificarea programelor prin exemple IF, ELSE și expresii logice în MiniScript+.",
  path: "/examples/conditions",
});

export default function ConditionExamplesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
