import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Probleme de programare",
  description:
    "Rezolvă probleme în MiniScript+, verifică soluțiile prin cazuri de test și primește feedback imediat pentru fiecare încercare.",
  path: "/problems",
});

export default function ProblemsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
