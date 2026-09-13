"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";

export function Footer() {
  const { locale } = useLanguage();

  const copy = locale === "ro"
    ? {
        tagline: "Învață programare prin practică, în limba ta.",
        productTitle: "Produs",
        product: [
          { href: "/editor", label: "Editor" },
          { href: "/problems", label: "Probleme" },
          { href: "/leaderboard", label: "Clasament" },
          { href: "/classes", label: "Clase" },
        ],
        resourcesTitle: "Resurse",
        resources: [
          { href: "/docs/basics", label: "Documentație" },
          { href: "/examples", label: "Exemple" },
          { href: "/updates", label: "Noutăți" },
          { href: "/help", label: "Ajutor" },
        ],
        companyTitle: "Companie",
        company: [
          { href: "/contact", label: "Contact" },
          { href: "/privacy", label: "Confidențialitate" },
          { href: "/terms", label: "Termeni" },
        ],
        rights: "Toate drepturile rezervate.",
      }
    : {
        tagline: "Learn programming by doing, in your own language.",
        productTitle: "Product",
        product: [
          { href: "/editor", label: "Editor" },
          { href: "/problems", label: "Problems" },
          { href: "/leaderboard", label: "Leaderboard" },
          { href: "/classes", label: "Classes" },
        ],
        resourcesTitle: "Resources",
        resources: [
          { href: "/docs/basics", label: "Docs" },
          { href: "/examples", label: "Examples" },
          { href: "/updates", label: "What's new" },
          { href: "/help", label: "Help" },
        ],
        companyTitle: "Company",
        company: [
          { href: "/contact", label: "Contact" },
          { href: "/privacy", label: "Privacy" },
          { href: "/terms", label: "Terms" },
        ],
        rights: "All rights reserved.",
      };

  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">

          <div className="space-y-3">
            <Link
              href="/"
              aria-label="ScripticX"
              className="inline-flex items-center"
            >
              <span className="text-xl font-semibold tracking-tight">
                Scriptic
              </span>
              <Image
                src="/logoSCX.svg"
                alt=""
                aria-hidden="true"
                width={48}
                height={34}
                className="h-6 w-auto shrink-0 object-contain dark:invert"
              />
            </Link>
            <p className="text-sm text-muted-foreground max-w-[220px]">
              {copy.tagline}
            </p>
          </div>

          <FooterColumn title={copy.productTitle} links={copy.product} />
          <FooterColumn title={copy.resourcesTitle} links={copy.resources} />
          <FooterColumn title={copy.companyTitle} links={copy.company} />

        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {year} ScripticX. {copy.rights}</span>
          <span>scripticx.org</span>
        </div>

      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
