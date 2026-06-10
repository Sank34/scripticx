import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Bazele MiniScript+",
  description:
    "Descoperă structura unui program MiniScript+, instrucțiunile de bază și primele reguli de sintaxă.",
  path: "/learn/basics",
});

export default function BasicsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
