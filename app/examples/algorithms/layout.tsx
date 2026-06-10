import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Algoritmi în MiniScript+",
  description:
    "Studiază algoritmi clasici implementați în MiniScript+ și urmărește logica lor pas cu pas.",
  path: "/examples/algorithms",
});

export default function AlgorithmExamplesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
