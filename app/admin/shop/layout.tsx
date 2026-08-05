import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Shop Items — Admin",
  description: "Manage ScripticX shop items and cosmetic assets.",
  path: "/admin/shop",
  noIndex: true,
});

export default function AdminShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
