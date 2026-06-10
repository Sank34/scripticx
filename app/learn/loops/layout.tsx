import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Bucle în MiniScript+",
  description:
    "Învață să repeți instrucțiuni cu WHILE și să urmărești pas cu pas evoluția variabilelor.",
  path: "/learn/loops",
});

export default function LoopsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
