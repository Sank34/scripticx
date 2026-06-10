import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Căutare",
  description: "Găsește utilizatori și conținut în comunitatea ScripticX.",
  path: "/search",
  noIndex: true,
});

export default function SearchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
