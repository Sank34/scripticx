"use client";

import { CheckCircle2 } from "lucide-react";

type DebuggerStateCardProps = {
  currentLine: number;
  title: string;
  variables: Record<string, unknown>;
};

export function DebuggerStateCard({
  currentLine,
  title,
  variables,
}: DebuggerStateCardProps) {
  return (
    <section className="rounded-xl border bg-card text-card-foreground">
      <div className="flex items-center gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        <CheckCircle2 size={14} />
        {title}
      </div>

      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Line</p>
            <p className="font-mono font-semibold">{currentLine}</p>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Variables</p>
            <p className="font-mono font-semibold">
              {Object.keys(variables).length}
            </p>
          </div>
        </div>

        <pre className="max-h-52 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-emerald-300">
          {JSON.stringify(variables, null, 2)}
        </pre>
      </div>
    </section>
  );
}
