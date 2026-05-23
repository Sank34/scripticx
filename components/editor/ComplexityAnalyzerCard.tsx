"use client";

import type { ComplexityAnalysis } from "@/lib/complexity-analyzer";
import { useLanguage } from "@/components/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Lightbulb } from "lucide-react";

type ComplexityAnalyzerCardProps = {
  analysis: ComplexityAnalysis | null;
  compact?: boolean;
  frame?: "card" | "section";
};

function getScoreColor(score: number) {
  if (score >= 85) return "text-emerald-500";
  if (score >= 65) return "text-lime-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

function getStrokeColor(score: number) {
  if (score >= 85) return "#10b981";
  if (score >= 65) return "#84cc16";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function ComplexityCircle({
  compact,
  label,
  score,
}: {
  compact: boolean;
  label: string;
  score: number;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor = getStrokeColor(score);
  const sizeClass = compact ? "h-24 w-24" : "h-28 w-28";

  return (
    <div className={`relative flex ${sizeClass} items-center justify-center`}>
      <svg className={`${sizeClass} -rotate-90`} viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className={compact ? "text-zinc-100" : "text-muted"}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={strokeColor}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute text-center">
        <div
          className={`${compact ? "text-xl" : "text-2xl"} font-bold ${getScoreColor(score)}`}
        >
          {score}%
        </div>
        <div
          className={`${compact ? "text-[9px] text-zinc-500" : "text-[10px] text-muted-foreground"} uppercase tracking-wide`}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function ComplexityContent({
  analysis,
  compact,
}: {
  analysis: ComplexityAnalysis | null;
  compact: boolean;
}) {
  const { t } = useLanguage();
  const mutedText = compact ? "text-zinc-500" : "text-muted-foreground";
  const softBox = compact ? "bg-zinc-50" : "bg-muted";
  const borderClass = compact ? "border border-zinc-200" : "border";

  if (!analysis) {
    return (
      <div className={`text-sm ${mutedText}`}>
        {t("editor.complexity.empty")}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-center">
        <ComplexityCircle
          compact={compact}
          label={t(`editor.complexity.levels.${analysis.level}`)}
          score={analysis.score}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className={`rounded-lg ${softBox} p-3`}>
          <p className={`text-xs ${mutedText}`}>
            {t("editor.complexity.metrics.time")}
          </p>
          <p className="font-semibold">{analysis.timeComplexity}</p>
        </div>

        <div className={`rounded-lg ${softBox} p-3`}>
          <p className={`text-xs ${mutedText}`}>
            {t("editor.complexity.metrics.space")}
          </p>
          <p className="font-semibold">{analysis.spaceComplexity}</p>
        </div>

        <div className={`rounded-lg ${borderClass} p-3`}>
          <p className={`text-xs ${mutedText}`}>
            {t("editor.complexity.metrics.loops")}
          </p>
          <p className="font-semibold">{analysis.loopCount}</p>
        </div>

        <div className={`rounded-lg ${borderClass} p-3`}>
          <p className={`text-xs ${mutedText}`}>
            {t("editor.complexity.metrics.maxNesting")}
          </p>
          <p className="font-semibold">{analysis.maxNestedLoops}</p>
        </div>
      </div>

      {analysis.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <div className="mb-2 font-semibold text-amber-700">
            {t("editor.complexity.warnings")}
          </div>
          <ul className="space-y-2 text-amber-700">
            {analysis.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={`rounded-lg ${borderClass} p-3 text-sm`}>
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <Lightbulb size={15} />
          {t("editor.complexity.suggestions")}
        </div>

        <ul className={`space-y-2 ${mutedText}`}>
          {analysis.suggestions.map((suggestion, index) => (
            <li key={index}>• {suggestion}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function ComplexityAnalyzerCard({
  analysis,
  compact = false,
  frame = "card",
}: ComplexityAnalyzerCardProps) {
  const { t } = useLanguage();
  const content = (
    <div className="space-y-4">
      <ComplexityContent analysis={analysis} compact={compact} />
    </div>
  );

  if (frame === "section") {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <Gauge size={14} />
          {t("editor.complexity.title")}
        </div>
        <div className="p-3">{content}</div>
      </section>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge size={18} />
          {t("editor.complexity.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
