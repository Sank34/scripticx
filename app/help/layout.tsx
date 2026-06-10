import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Ajutor",
  description:
    "Găsește răspunsuri și indicații pentru utilizarea editorului, problemelor și funcțiilor ScripticX.",
  path: "/help",
});

export default function HelpLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
