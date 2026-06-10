import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Editor MiniScript+",
  description:
    "Scrie și rulează cod MiniScript+, urmărește execuția pas cu pas și analizează structura și complexitatea programului.",
  path: "/editor",
  noIndex: true,
});

export default function EditorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
