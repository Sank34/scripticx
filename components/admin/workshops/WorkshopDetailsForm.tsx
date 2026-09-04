"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  parseTrainers,
  WORKSHOP_STATUSES,
  type Workshop,
  type WorkshopStatus,
} from "@/lib/trainer-portal";
import type { TrainerPortalCopy } from "@/lib/trainer-portal-copy";

export function toPickerValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function WorkshopDetailsForm({
  copy,
  locale,
  onSave,
  workshop,
}: {
  copy: TrainerPortalCopy;
  locale: "en" | "ro";
  onSave: (patch: Partial<Workshop>) => void;
  workshop: Workshop;
}) {
  const [form, setForm] = useState(() => ({
    title: workshop.title,
    summary: workshop.summary,
    startsAt: toPickerValue(workshop.startsAt),
    location: workshop.location,
    audience: workshop.audience,
    trainers: workshop.trainers.join(", "),
    status: workshop.status,
  }));

  useEffect(() => {
    setForm({
      title: workshop.title,
      summary: workshop.summary,
      startsAt: toPickerValue(workshop.startsAt),
      location: workshop.location,
      audience: workshop.audience,
      trainers: workshop.trainers.join(", "),
      status: workshop.status,
    });
  }, [workshop.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function save() {
    const startsAt = new Date(form.startsAt);

    onSave({
      title: form.title.trim() || workshop.title,
      summary: form.summary.trim(),
      startsAt: Number.isNaN(startsAt.getTime())
        ? workshop.startsAt
        : startsAt.toISOString(),
      location: form.location.trim(),
      audience: form.audience.trim(),
      trainers: parseTrainers(form.trainers),
      status: form.status,
    });
  }

  return (
    <Card>
      <CardContent className="grid gap-4 p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="workshop-title">
            {copy.fieldTitle}
          </label>
          <Input
            id="workshop-title"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="workshop-summary">
            {copy.fieldSummary}
          </label>
          <Textarea
            id="workshop-summary"
            rows={3}
            value={form.summary}
            onChange={(event) =>
              setForm((current) => ({ ...current, summary: event.target.value }))
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">{copy.fieldStartsAt}</label>
            <DateTimePicker
              locale={locale}
              placeholder={copy.fieldStartsAt}
              value={form.startsAt}
              onChange={(startsAt) => setForm((current) => ({ ...current, startsAt }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="workshop-status">
              {copy.fieldStatus}
            </label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, status: value as WorkshopStatus }))
              }
            >
              <SelectTrigger id="workshop-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKSHOP_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {copy.statuses[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="workshop-location">
              {copy.fieldLocation}
            </label>
            <Input
              id="workshop-location"
              value={form.location}
              onChange={(event) =>
                setForm((current) => ({ ...current, location: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="workshop-audience">
              {copy.fieldAudience}
            </label>
            <Input
              id="workshop-audience"
              value={form.audience}
              onChange={(event) =>
                setForm((current) => ({ ...current, audience: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="workshop-trainers">
            {copy.fieldTrainers}
          </label>
          <Input
            id="workshop-trainers"
            aria-describedby="workshop-trainers-hint"
            value={form.trainers}
            onChange={(event) =>
              setForm((current) => ({ ...current, trainers: event.target.value }))
            }
          />
          <p id="workshop-trainers-hint" className="text-xs text-muted-foreground">
            {copy.fieldTrainersHint}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={save}>{copy.save}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
