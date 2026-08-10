"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LiveConsolePanelProps = {
  currentLine: number;
  inputPlaceholder: string;
  inputPrompt: string;
  inputValue: string;
  noOutputLabel: string;
  okLabel: string;
  onInputValueChange: (value: string) => void;
  onSubmitInput: () => void;
  output: string[];
  title: string;
  variables: Record<string, unknown>;
  waitingInput: string | null;
};

export function LiveConsolePanel({
  currentLine,
  inputPlaceholder,
  inputPrompt,
  inputValue,
  noOutputLabel,
  okLabel,
  onInputValueChange,
  onSubmitInput,
  output,
  title,
  variables,
  waitingInput,
}: LiveConsolePanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b bg-muted/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 font-mono text-sm text-emerald-300">
        {output.length === 0 ? (
          <div className="text-zinc-500">{noOutputLabel}</div>
        ) : (
          output.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)
        )}
      </div>

      {waitingInput && (
        <div className="border-t bg-background p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {inputPrompt} {waitingInput}
          </div>
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(event) => onInputValueChange(event.target.value)}
              placeholder={inputPlaceholder}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSubmitInput();
              }}
            />
            <Button size="sm" onClick={onSubmitInput}>
              {okLabel}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 border-t bg-background p-3">
        <div className="rounded-lg border p-2">
          <div className="text-xs text-muted-foreground">Line</div>
          <div className="font-mono text-sm">{currentLine}</div>
        </div>
        <div className="rounded-lg border p-2">
          <div className="text-xs text-muted-foreground">Variables</div>
          <div className="font-mono text-sm">{Object.keys(variables).length}</div>
        </div>
      </div>
    </div>
  );
}
