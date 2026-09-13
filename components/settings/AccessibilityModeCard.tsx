"use client";

import { Accessibility } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAccessibilityMode } from "@/components/AccessibilityProvider";
import { useLanguage } from "@/components/LanguageProvider";

export function AccessibilityModeCard() {
  const { locale } = useLanguage();
  const { enabled, setEnabled } = useAccessibilityMode();
  const ro = locale === "ro";
  const title = ro ? "Mod accesibilitate" : "Accessibility mode";

  return (
    <Card id="accessibility-settings" className="scroll-mt-24">
      <CardHeader>
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Accessibility className="size-4" aria-hidden="true" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {ro
            ? "Crește contrastul și face stările mai ușor de deosebit pe proiectoare și pentru persoanele cu daltonism."
            : "Increases contrast and makes states easier to distinguish on projectors and for people with color vision deficiency."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">{ro ? "Contrast ridicat" : "High contrast"}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {ro
                ? "Păstrează culorile UI-ului, dar întărește suprafețele, marginile și focusul."
                : "Keeps the existing UI language while strengthening surfaces, borders, and focus."}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label={title}
          />
        </div>
      </CardContent>
    </Card>
  );
}
