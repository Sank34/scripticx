"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export default function BasicsPage() {
  const { locale } = useLanguage();
  const router = useRouter();

  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[locale];

    for (const k of keys) value = value?.[k];
    if (value) return value;

    let fallback: any = translations["en"];
    for (const k of keys) fallback = fallback?.[k];
    return fallback || key;
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Basics</h1>
        <p className="text-muted-foreground">
          Simple examples to understand how the language works
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          {/* PRINT */}
          <div>
            <h2 className="text-xl font-semibold">Printing text</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Use PRINT to display messages.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`PRINT "Hello"
PRINT "World"`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`PRINT "Hello"\nPRINT "World"`)}`)
              }
            >
              Run
            </Button>
          </div>

          {/* VARIABLES */}
          <div>
            <h2 className="text-xl font-semibold">Variables</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Store values in variables and print them.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 5
PRINT X`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`X = 5\nPRINT X`)}`)
              }
            >
              Run
            </Button>
          </div>

          {/* MATH */}
          <div>
            <h2 className="text-xl font-semibold">Math operations</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You can perform calculations using operators.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`A = 5 + 3
B = A * 2
PRINT B`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`A = 5 + 3\nB = A * 2\nPRINT B`)}`)
              }
            >
              Run
            </Button>
          </div>

          {/* CONDITIONS */}
          <div>
            <h2 className="text-xl font-semibold">Conditions</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Use IF statements to control program flow.
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 10
IF X > 5 THEN
PRINT "Big"
END`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`X = 10\nIF X > 5 THEN\nPRINT "Big"\nEND`)}`)
              }
            >
              Run
            </Button>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}