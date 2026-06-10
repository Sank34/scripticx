import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Clase",
  description:
    "Organizează clase, teme și progresul educațional într-un spațiu ScripticX dedicat.",
  path: "/classes",
  noIndex: true,
});

export default function ClassesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
