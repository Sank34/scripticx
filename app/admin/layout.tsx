import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Administrare",
  description: "Panoul de administrare al platformei ScripticX.",
  path: "/admin",
  noIndex: true,
});

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
