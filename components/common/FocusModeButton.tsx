"use client";

import { Maximize2, Minimize2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type FocusModeButtonProps = {
  active: boolean;
  onChange: (active: boolean) => void;
  locale: string;
};

export function FocusModeButton({ active, onChange, locale }: FocusModeButtonProps) {
  const romanian = locale === "ro";
  const label = active
    ? romanian ? "Ieși din modul extins" : "Exit focus mode"
    : romanian ? "Extinde fără shell" : "Expand without shell";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="hidden h-8 gap-1.5 px-2.5 text-foreground md:inline-flex"
      onClick={() => onChange(!active)}
      aria-label={label}
      aria-pressed={active}
      title={`${label}${active ? " (Esc)" : ""}`}
    >
      {active ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      <span className="hidden lg:inline">{active ? romanian ? "Ieși" : "Exit" : romanian ? "Extinde" : "Expand"}</span>
    </Button>
  );
}
