import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Clasament",
  description:
    "Urmărește clasamentul comunității ScripticX și progresul obținut prin probleme și challenge-uri.",
  path: "/leaderboard",
});

export default function LeaderboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
