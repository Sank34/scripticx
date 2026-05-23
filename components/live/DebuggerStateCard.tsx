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
    <section className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <CheckCircle2 size={14} />
        {title}
      </div>

      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Line</p>
            <p className="font-mono font-semibold">{currentLine}</p>
          </div>

          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Variables</p>
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
