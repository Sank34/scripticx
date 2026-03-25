"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    pathname === path
      ? "font-semibold text-primary"
      : "text-muted-foreground";

  return (
    <div className="border-b px-6 py-3 flex items-center justify-between">
      
      {/* Logo */}
      <Link href="/" className="text-lg font-bold">
        Scripticx
      </Link>

      {/* Navigation */}
      <div className="flex gap-2">
        <Link href="/editor">
          <Button variant={pathname === "/editor" ? "default" : "ghost"}>
            Editor
          </Button>
        </Link>

        <Link href="/problems">
          <Button variant={pathname === "/problems" ? "default" : "ghost"}>
            Problems
          </Button>
        </Link>
      </div>
    </div>
  );
}