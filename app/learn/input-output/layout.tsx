import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Input and Output in MiniScript+",
  description:
    "Use INPUT and PRINT to read data, display results, and build interactive MiniScript+ programs.",
  path: "/learn/input-output",
});

export default function InputOutputLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
