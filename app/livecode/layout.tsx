import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Programare live",
  description:
    "Creează sau accesează sesiuni ScripticX pentru programare colaborativă în timp real.",
  path: "/livecode",
  noIndex: true,
});

export default function LiveCodeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
