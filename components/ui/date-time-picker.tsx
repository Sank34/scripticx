"use client";

import { format } from "date-fns";
import { enUS, ro } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function toValue(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function DateTimePicker({
  allowClear = false,
  className,
  locale = "en",
  onChange,
  placeholder,
  showTime = true,
  timeLabel,
  value,
}: {
  allowClear?: boolean;
  className?: string;
  locale?: "en" | "ro";
  onChange: (value: string) => void;
  placeholder: string;
  showTime?: boolean;
  timeLabel?: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseValue(value);
  const dateLocale = locale === "ro" ? ro : enUS;
  const timeValue = selected ? format(selected, "HH:mm") : "";

  function selectDate(nextDate: Date | undefined) {
    if (!nextDate) return;
    const next = new Date(nextDate);
    next.setHours(selected?.getHours() ?? 9, selected?.getMinutes() ?? 0, 0, 0);
    onChange(toValue(next));
    setOpen(false);
  }

  function selectTime(nextTime: string) {
    if (!/^\d{2}:\d{2}$/.test(nextTime)) return;
    const [hours, minutes] = nextTime.split(":").map(Number);
    const next = selected ? new Date(selected) : new Date();
    next.setHours(hours, minutes, 0, 0);
    onChange(toValue(next));
  }

  return (
    <div
      className={cn(
        "grid min-w-0 gap-2",
        showTime
          ? "grid-cols-[minmax(0,1fr)_104px_auto]"
          : "grid-cols-[minmax(0,1fr)_auto]",
        className
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "min-w-0 justify-start gap-2 px-3 font-normal",
              !selected && "text-muted-foreground"
            )}
          >
            <CalendarDays className="size-4 shrink-0" />
            <span className="truncate">
              {selected ? format(selected, "PP", { locale: dateLocale }) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected || undefined}
            defaultMonth={selected || undefined}
            onSelect={selectDate}
            locale={dateLocale}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>

      {showTime && (
        <Input
          type="time"
          value={timeValue}
          disabled={!selected}
          aria-label={timeLabel || (locale === "ro" ? "Ora" : "Time")}
          onChange={(event) => selectTime(event.target.value)}
          className="px-2"
        />
      )}

      {allowClear ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={locale === "ro" ? "Șterge data" : "Clear date"}
          disabled={!value}
          onClick={() => onChange("")}
        >
          <X className="size-4" />
        </Button>
      ) : (
        <span aria-hidden className="w-9" />
      )}
    </div>
  );
}
