import type { Metadata } from "next";

import UpdatesLayoutClient from "@/components/updates/UpdatesLayoutClient";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Noutăți și actualizări",
  description:
    "Descoperă funcționalitățile noi, îmbunătățirile și corecțiile lansate în platforma ScripticX.",
  path: "/updates",
  keywords: ["noutăți ScripticX", "changelog ScripticX", "actualizări platformă"],
});

export default function UpdatesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <UpdatesLayoutClient>{children}</UpdatesLayoutClient>;
}
