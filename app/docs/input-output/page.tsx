"use client";

import { Card, CardContent } from "@/components/ui/card";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export default function InputOutputPage() {
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
        <h1 className="text-4xl font-bold">{t("learn.inputOutputPage.title")}</h1>
        <p className="text-muted-foreground">
          {t("learn.inputOutputPage.subtitle")}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          <div>
            <h2 className="text-xl font-semibold">{t("learn.inputOutputPage.sections.output.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.inputOutputPage.sections.output.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`PRINT "Hello"
PRINT 10`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.inputOutputPage.sections.variables.title")}</h2>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 5
PRINT X`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.inputOutputPage.sections.input.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.inputOutputPage.sections.input.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`INPUT X
PRINT X`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.inputOutputPage.sections.example.title")}</h2>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`INPUT A
INPUT B
PRINT A + B`}
            </pre>

            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.inputOutputPage.sections.example.text")}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.inputOutputPage.sections.how.title")}</h2>
            <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1 mt-2">
              {t("learn.inputOutputPage.sections.how.bullets").map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.inputOutputPage.sections.types.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.inputOutputPage.sections.types.text")}
            </p>

            <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1 mt-2">
              {t("learn.inputOutputPage.sections.types.bullets").map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.inputOutputPage.sections.mistake.title")}</h2>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`INPUT X
PRINT X + 1`}
            </pre>

            <p className="text-xs text-muted-foreground mt-2">
              {t("learn.inputOutputPage.sections.mistake.note")}
            </p>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
