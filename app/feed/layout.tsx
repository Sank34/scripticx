import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Feed",
  description:
    "Descoperă soluții, fragmente de cod și progresul comunității ScripticX.",
  path: "/feed",
  noIndex: true,
});

export default function FeedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
