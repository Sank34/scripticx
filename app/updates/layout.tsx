import type { Metadata } from "next";

import UpdatesLayoutClient from "@/components/updates/UpdatesLayoutClient";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "What's New",
  description:
    "Explore new features, improvements, and fixes released across the ScripticX platform.",
  path: "/updates",
  keywords: ["ScripticX updates", "ScripticX changelog", "platform releases"],
});

export default function UpdatesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <UpdatesLayoutClient>{children}</UpdatesLayoutClient>;
}
