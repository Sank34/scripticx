import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Rewards Shop",
  description: "Spend ScripticX points on profile rewards and avatar decorations.",
  path: "/shop",
  noIndex: true,
});

export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
