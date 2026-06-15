import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Leaderboard",
  description:
    "Follow the ScripticX community leaderboard and progress earned through problems and daily challenges.",
  path: "/leaderboard",
});

export default function LeaderboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
