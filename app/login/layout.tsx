import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Autentificare",
  description:
    "Autentifică-te sau creează un cont pentru a începe experiența ScripticX.",
  path: "/login",
  noIndex: true,
});

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
