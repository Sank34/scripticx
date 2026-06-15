import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Feed",
  description:
    "Discover solutions, code snippets, and progress shared by the ScripticX community.",
  path: "/feed",
  noIndex: true,
});

export default function FeedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
