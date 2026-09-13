import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Competitions",
  description: "Join ScripticX programming competitions and follow live rankings.",
  path: "/competitions",
});

export default function CompetitionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
