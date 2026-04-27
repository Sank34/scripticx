"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export default function NotFound() {
  const { locale } = useLanguage();
  const t = translations[locale].notFound;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">

      <Card className="max-w-md w-full shadow-xl">
        <CardContent className="flex flex-col items-center text-center space-y-4 p-8">

          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-muted">
            <SearchX className="w-7 h-7 text-muted-foreground" />
          </div>

          <h1 className="text-2xl font-bold">
            {t.title}
          </h1>

          <p className="text-sm text-muted-foreground">
            {t.description}
          </p>

          <Link href="/dashboard">
            <Button className="mt-2">
              {t.goHome}
            </Button>
          </Link>

        </CardContent>
      </Card>

    </div>
  );
}