"use client";

import { Maximize2, Minimize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type FocusModeButtonProps = {
  active: boolean;
  onChange: (active: boolean) => void;
  locale: string;
  iconOnly?: boolean;
};

export function FocusModeButton({ active, onChange, locale, iconOnly = false }: FocusModeButtonProps) {
  const romanian = locale === "ro";
  const label = active
    ? romanian ? "Ieși din modul extins" : "Exit focus mode"
    : romanian ? "Extinde fără shell" : "Expand without shell";

  const button = (
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? "icon-sm" : "sm"}
      className={iconOnly ? "hidden text-foreground md:inline-flex" : "hidden h-8 gap-1.5 px-2.5 text-foreground md:inline-flex"}
      onClick={() => onChange(!active)}
      aria-label={label}
      aria-pressed={active}
      title={iconOnly ? undefined : `${label}${active ? " (Esc)" : ""}`}
    >
      {active ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      {!iconOnly && <span className="hidden lg:inline">{active ? romanian ? "Ieși" : "Exit" : romanian ? "Extinde" : "Expand"}</span>}
    </Button>
  );
  return iconOnly ? (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}{active ? " (Esc)" : ""}</TooltipContent>
    </Tooltip>
  ) : button;
}
