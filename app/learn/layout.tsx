import type { Metadata } from "next";

import LearnLayoutClient from "@/components/learn/LearnLayoutClient";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Documentație MiniScript+",
  description:
    "Învață sintaxa MiniScript+, variabilele, condițiile, buclele și operațiile de intrare-ieșire prin explicații și exemple practice.",
  path: "/learn",
  keywords: [
    "documentație MiniScript+",
    "tutorial programare începători",
    "sintaxă MiniScript+",
  ],
});

export default function LearnLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <LearnLayoutClient>{children}</LearnLayoutClient>;
}
