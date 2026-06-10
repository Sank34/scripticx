import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Exemple cu bucle MiniScript+",
  description:
    "Explorează exemple practice cu bucle WHILE, contoare și prelucrări repetitive în MiniScript+.",
  path: "/examples/loops",
});

export default function LoopExamplesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
