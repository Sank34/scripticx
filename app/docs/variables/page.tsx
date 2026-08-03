"use client";

import { Card, CardContent } from "@/components/ui/card";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export default function VariablesPage() {
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{t("learn.variablesPage.title")}</h1>
        <p className="text-muted-foreground">
          {t("learn.variablesPage.subtitle")}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          <div>
            <h2 className="text-xl font-semibold">{t("learn.variablesPage.sections.what.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.variablesPage.sections.what.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 10`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.variablesPage.sections.using.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.variablesPage.sections.using.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 10
PRINT X`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.variablesPage.sections.updating.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.variablesPage.sections.updating.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 5
X = X + 2
PRINT X`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.variablesPage.sections.types.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.variablesPage.sections.types.text")}
            </p>

            <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1 mt-2">
              {t("learn.variablesPage.sections.types.bullets").map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`A = 10
B = "Hello"
C = true`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.variablesPage.sections.naming.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.variablesPage.sections.naming.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`score = 100
name = "Alex"`}
            </pre>

            <p className="text-xs text-muted-foreground mt-2">
              {t("learn.variablesPage.sections.naming.note")}
            </p>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
