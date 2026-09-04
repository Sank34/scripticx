import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Trainer portal",
  description: "Plan and run ScripticX workshops: agenda, decks, games, and notes.",
  path: "/admin/workshops",
  noIndex: true,
});

export default function AdminWorkshopsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
