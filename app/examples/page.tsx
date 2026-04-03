"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";
import Link from "next/link";

export default function ExamplesPage() {
  const { locale } = useLanguage();

  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[locale];

    for (const k of keys) value = value?.[k];
    if (value) return value;

    let fallback: any = translations["en"];
    for (const k of keys) fallback = fallback?.[k];
    return fallback || key;
  };

  const sections = [
    {
      title: "Basics",
      href: "/examples/basics",
      description: "Simple programs and syntax examples",
    },
    {
      title: "Loops",
      href: "/examples/loops",
      description: "Practice with loops and iterations",
    },
    {
      title: "Conditions",
      href: "/examples/conditions",
      description: "If statements and logic",
    },
    {
      title: "Algorithms",
      href: "/examples/algorithms",
      description: "Classic problems and solutions",
    },
  ];

  return (
    <div className="space-y-6">

      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Examples</h1>
        <p className="text-muted-foreground">
          Explore practical coding examples and learn by doing
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((sec) => (
          <Link key={sec.href} href={sec.href}>
            <Card className="hover:scale-[1.02] transition cursor-pointer">
              <CardContent className="p-5 space-y-2">
                <h2 className="text-lg font-semibold">{sec.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {sec.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

    </div>
  );
}