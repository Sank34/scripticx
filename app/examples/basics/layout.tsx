import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Exemple de bază MiniScript+",
  description:
    "Rulează exemple MiniScript+ simple pentru afișare, atribuiri și primele programe.",
  path: "/examples/basics",
});

export default function BasicsExamplesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
