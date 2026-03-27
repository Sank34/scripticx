"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const docsPages = [
  { href: "/learn", label: "Introduction" },
  { href: "/learn/basics", label: "Basics" },
  { href: "/learn/variables", label: "Variables" },
  { href: "/learn/loops", label: "Loops" },
  { href: "/learn/input-output", label: "Input / Output" },
];

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const currentIndex = docsPages.findIndex(p => p.href === pathname);

  const prev = docsPages[currentIndex - 1];
  const next = docsPages[currentIndex + 1];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/learn">Docs</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {currentIndex > 0 && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink>
                  {docsPages[currentIndex]?.label}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div>{children}</div>

      <Pagination>
        <PaginationContent className="justify-between w-full">

          <PaginationItem>
            {prev ? (
              <PaginationPrevious
                onClick={() => router.push(prev.href)}
                className="cursor-pointer"
              />
            ) : (
              <span />
            )}
          </PaginationItem>

          <PaginationItem>
            {next ? (
              <PaginationNext
                onClick={() => router.push(next.href)}
                className="cursor-pointer"
              />
            ) : (
              <span />
            )}
          </PaginationItem>

        </PaginationContent>
      </Pagination>

    </div>
  );
}