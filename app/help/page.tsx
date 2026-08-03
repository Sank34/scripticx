"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, BookOpen, Code, MessageSquare } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

type FAQ = { q: string; a: string };

export default function HelpPage() {
  const { locale } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const copy = locale === "ro"
    ? {
        title: "Ajutor",
        subtitle: "Răspunsuri la întrebări frecvente și resurse utile.",
        quickLinks: "Resurse rapide",
        docsTitle: "Documentație",
        docsText: "Învață MiniScript+ pas cu pas.",
        editorTitle: "Editor",
        editorText: "Scrie și rulează cod direct în browser.",
        contactTitle: "Contact",
        contactText: "Ne poți scrie direct dacă nu găsești răspunsul.",
        faqTitle: "Întrebări frecvente",
        faqs: [
          { q: "Cum încep să scriu cod în MiniScript+?", a: "Mergi în Editor, alege un exemplu sau scrie codul de la zero. Apasă pe Run pentru a-l executa." },
          { q: "Cum îmi rezolv o problemă?", a: "Deschide secțiunea Probleme, alege una și scrie soluția. Vei primi feedback imediat." },
          { q: "Cum mă alătur unei clase?", a: "Mergi la pagina Clase și folosește codul de invitație primit de la profesor." },
          { q: "Cum schimb limba?", a: "Apasă pe avatar în dreapta sus și alege EN sau RO." },
          { q: "Mi-am pierdut progresul. Ce fac?", a: "Toate datele sunt salvate pe contul tău. Asigură-te că ești autentificat cu același cont." },
        ] as FAQ[],
      }
    : {
        title: "Help",
        subtitle: "Answers to common questions and useful resources.",
        quickLinks: "Quick links",
        docsTitle: "Documentation",
        docsText: "Learn MiniScript+ step by step.",
        editorTitle: "Editor",
        editorText: "Write and run code right in your browser.",
        contactTitle: "Contact",
        contactText: "Reach out directly if you can't find an answer.",
        faqTitle: "Frequently asked questions",
        faqs: [
          { q: "How do I start writing MiniScript+ code?", a: "Open the Editor, pick an example or start from scratch, and press Run to execute." },
          { q: "How do I solve a problem?", a: "Go to Problems, pick one, and write your solution. You'll get instant feedback." },
          { q: "How do I join a class?", a: "Go to the Classes page and use the invite code your teacher gave you." },
          { q: "How do I change the language?", a: "Click your avatar in the top right and pick EN or RO." },
          { q: "I lost my progress. What now?", a: "All data is saved on your account — make sure you're signed in with the same one." },
        ] as FAQ[],
      };

  const quickLinks = [
    { href: "/docs/basics", icon: BookOpen, title: copy.docsTitle, text: copy.docsText },
    { href: "/editor", icon: Code, title: copy.editorTitle, text: copy.editorText },
    { href: "/contact", icon: MessageSquare, title: copy.contactTitle, text: copy.contactText },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">

      <div>
        <h1 className="text-3xl font-bold">{copy.title}</h1>
        <p className="text-muted-foreground">{copy.subtitle}</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{copy.quickLinks}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {quickLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              <Card className="h-full cursor-pointer hover:shadow-sm transition">
                <CardContent className="p-4 space-y-2">
                  <l.icon size={18} />
                  <h3 className="font-medium">{l.title}</h3>
                  <p className="text-xs text-muted-foreground">{l.text}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{copy.faqTitle}</h2>
        <Card>
          <CardContent className="p-0">
            {copy.faqs.map((faq, i) => {
              const open = openIndex === i;
              return (
                <div
                  key={i}
                  className="border-b last:border-none"
                >
                  <button
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-200 hover:bg-muted/50"
                  >
                    <span className="font-medium text-sm">{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      open
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div
                        className={`px-4 pb-3 text-sm text-muted-foreground transition-transform duration-300 ease-out ${
                          open ? "translate-y-0" : "-translate-y-1"
                        }`}
                      >
                        {faq.a}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
