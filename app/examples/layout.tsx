import type { Metadata } from "next";

import ExamplesLayoutClient from "@/components/examples/ExamplesLayoutClient";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Exemple MiniScript+",
  description:
    "Explorează programe MiniScript+ pentru noțiuni de bază, condiții, bucle și algoritmi, gata de urmărit și rulat în platformă.",
  path: "/examples",
  keywords: [
    "exemple MiniScript+",
    "algoritmi pentru începători",
    "exemple cod programare",
  ],
});

export default function ExamplesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ExamplesLayoutClient>{children}</ExamplesLayoutClient>;
}
