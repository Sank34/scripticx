"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Code2,
  MessageSquare,
  Search,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FAQ = { q: string; a: string };

export default function HelpPage() {
  const { locale } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [query, setQuery] = useState("");

  const copy = locale === "ro"
    ? {
        title: "Centru de ajutor",
        subtitle: "Ghiduri, răspunsuri și resurse pentru utilizarea platformei ScripticX.",
        contactAction: "Contactează echipa",
        resourcesTitle: "Resurse principale",
        resourcesDescription: "Continuă direct către secțiunea de care ai nevoie.",
        docsTitle: "Documentație",
        docsText: "Sintaxă MiniScript+, exemple și ghiduri pentru platformă.",
        editorTitle: "Editor",
        editorText: "Creează proiecte, rulează cod și gestionează fișierele.",
        contactTitle: "Asistență",
        contactText: "Trimite o solicitare atunci când este necesară verificarea echipei.",
        open: "Deschide",
        faqTitle: "Întrebări frecvente",
        faqDescription: "Caută după funcție, cont sau activitate.",
        searchPlaceholder: "Caută în centrul de ajutor…",
        searchLabel: "Caută întrebări frecvente",
        noResultsTitle: "Niciun rezultat",
        noResultsText: "Încearcă un termen mai scurt sau trimite o solicitare echipei.",
        stillNeedHelp: "Ai nevoie de ajutor suplimentar?",
        stillNeedHelpText: "Trimite contextul complet și echipa ScripticX va răspunde prin email.",
        faqs: [
          { q: "Cum creez un proiect MiniScript+?", a: "Deschide Editor, selectează New project și alege MiniScript+. Proiectul poate conține fișiere și directoare, iar modificările sunt salvate în cont." },
          { q: "Cum rulez codul în editor?", a: "Deschide fișierul principal și folosește Run. Rezultatul și erorile de execuție apar în panoul terminalului din același workspace." },
          { q: "Cum rezolv o problemă?", a: "Deschide secțiunea Probleme, alege un exercițiu și trimite soluția din editorul problemei. Cazurile de test disponibile sunt evaluate la fiecare trimitere." },
          { q: "Cum mă alătur unei clase?", a: "Deschide Classes din workspace-ul de elev și introdu codul de invitație primit de la profesor." },
          { q: "Unde se salvează notițele și proiectele?", a: "Conținutul asociat contului este sincronizat cu baza de date. Schimbările locale sunt păstrate temporar atunci când conexiunea nu este disponibilă." },
          { q: "Cum schimb limba interfeței?", a: "Deschide Settings și selectează limba preferată. Alegerea se aplică interfeței și este păstrată pentru sesiunile următoare." },
          { q: "Progresul nu apare pe alt dispozitiv. Ce verific?", a: "Confirmă că folosești același cont și că adresa de email este verificată. Apoi reîncarcă pagina după restabilirea conexiunii." },
        ] as FAQ[],
      }
    : {
        title: "Help center",
        subtitle: "Guides, answers, and resources for using the ScripticX platform.",
        contactAction: "Contact support",
        resourcesTitle: "Primary resources",
        resourcesDescription: "Continue directly to the section you need.",
        docsTitle: "Documentation",
        docsText: "MiniScript+ syntax, examples, and platform guides.",
        editorTitle: "Editor",
        editorText: "Create projects, run code, and manage project files.",
        contactTitle: "Support",
        contactText: "Submit a request when the ScripticX team needs to review an issue.",
        open: "Open",
        faqTitle: "Frequently asked questions",
        faqDescription: "Search by feature, account, or activity.",
        searchPlaceholder: "Search the help center…",
        searchLabel: "Search frequently asked questions",
        noResultsTitle: "No results found",
        noResultsText: "Try a shorter search term or submit a request to the team.",
        stillNeedHelp: "Need additional support?",
        stillNeedHelpText: "Provide the complete context and the ScripticX team will respond by email.",
        faqs: [
          { q: "How do I create a MiniScript+ project?", a: "Open Editor, select New project, and choose MiniScript+. A project can contain files and folders, and changes are saved to your account." },
          { q: "How do I run code in the editor?", a: "Open the main file and use Run. Program output and runtime errors appear in the terminal panel inside the same workspace." },
          { q: "How do I solve a problem?", a: "Open Problems, select an exercise, and submit the solution from the problem editor. Available test cases are evaluated with every submission." },
          { q: "How do I join a class?", a: "Open Classes from the student workspace and enter the invitation code provided by your teacher." },
          { q: "Where are notes and projects stored?", a: "Content linked to your account is synchronized with the database. Local changes are kept temporarily when the connection is unavailable." },
          { q: "How do I change the interface language?", a: "Open Settings and select your preferred language. The selection is applied to the interface and retained for future sessions." },
          { q: "My progress is missing on another device. What should I check?", a: "Confirm that you are using the same account and that its email address is verified. Then reload after the connection is restored." },
        ] as FAQ[],
      };

  const resources = [
    { href: "/docs/basics", icon: BookOpen, title: copy.docsTitle, text: copy.docsText },
    { href: "/editor", icon: Code2, title: copy.editorTitle, text: copy.editorText },
    { href: "/contact", icon: MessageSquare, title: copy.contactTitle, text: copy.contactText },
  ];

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    if (!normalizedQuery) return copy.faqs.map((faq, index) => ({ faq, index }));

    return copy.faqs
      .map((faq, index) => ({ faq, index }))
      .filter(({ faq }) => `${faq.q} ${faq.a}`.toLocaleLowerCase(locale).includes(normalizedQuery));
  }, [copy.faqs, locale, query]);

  return (
    <PageContainer variant="wide" className="space-y-10 pb-8">
      <PageHeader
        className="border-b border-border/70 pb-6"
        title={copy.title}
        subtitle={copy.subtitle}
        action={
          <Button asChild variant="outline" size="lg">
            <Link href="/contact">{copy.contactAction}</Link>
          </Button>
        }
      />

      <section className="space-y-4" aria-labelledby="help-resources-title">
        <div>
          <h2 id="help-resources-title" className="text-xl font-semibold text-foreground">{copy.resourcesTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.resourcesDescription}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {resources.map((resource) => (
            <Link
              key={resource.href}
              href={resource.href}
              className="sx-surface sx-interactive group flex min-h-44 flex-col p-5 hover:border-foreground/20 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="grid size-9 place-items-center rounded-[var(--sx-radius-control)] border border-border bg-background text-muted-foreground">
                <resource.icon className="size-4" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-semibold text-foreground">{resource.title}</h3>
              <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{resource.text}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                {copy.open}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]" aria-labelledby="help-faq-title">
        <div className="sx-surface overflow-hidden">
          <div className="border-b border-border p-5 sm:p-6">
            <h2 id="help-faq-title" className="text-xl font-semibold text-foreground">{copy.faqTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.faqDescription}</p>
            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                aria-label={copy.searchLabel}
                className="h-10 pl-9"
              />
            </div>
          </div>

          {filteredFaqs.length ? (
            <div className="divide-y divide-border">
              {filteredFaqs.map(({ faq, index }) => {
                const open = openIndex === index;
                const answerId = `help-answer-${index}`;
                return (
                  <div key={faq.q}>
                    <button
                      type="button"
                      onClick={() => setOpenIndex(open ? null : index)}
                      aria-expanded={open}
                      aria-controls={answerId}
                      className="sx-interactive flex w-full items-center justify-between gap-5 px-5 py-4 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 sm:px-6"
                    >
                      <span className="text-sm font-medium leading-6 text-foreground">{faq.q}</span>
                      <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
                    </button>
                    <div className={cn("grid transition-[grid-template-rows] duration-200", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                      <div id={answerId} className="overflow-hidden">
                        <p className="px-5 pb-5 text-sm leading-6 text-muted-foreground sm:px-6">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <h3 className="font-semibold text-foreground">{copy.noResultsTitle}</h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">{copy.noResultsText}</p>
            </div>
          )}
        </div>

        <aside className="sx-surface p-5 lg:sticky lg:top-6">
          <h2 className="font-semibold text-foreground">{copy.stillNeedHelp}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.stillNeedHelpText}</p>
          <Button asChild className="mt-5 w-full" size="lg">
            <Link href="/contact">{copy.contactAction}</Link>
          </Button>
        </aside>
      </section>
    </PageContainer>
  );
}
