import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Intrare și ieșire în MiniScript+",
  description:
    "Folosește INPUT și PRINT pentru a citi date, a afișa rezultate și a construi programe interactive.",
  path: "/learn/input-output",
});

export default function InputOutputLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
