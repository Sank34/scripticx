import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Live Coding",
  description:
    "Create or join ScripticX sessions for real-time collaborative programming.",
  path: "/livecode",
  noIndex: true,
});

export default function LiveCodeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
