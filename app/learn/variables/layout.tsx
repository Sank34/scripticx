import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Variabile în MiniScript+",
  description:
    "Învață cum se declară, actualizează și folosesc variabilele și valorile în programele MiniScript+.",
  path: "/learn/variables",
});

export default function VariablesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
