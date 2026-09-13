"use client";

import { format } from "date-fns";
import { FolderKanban, LoaderCircle, MapPin, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  plannerColors,
  type PlannerColor,
  type PlannerEventInput,
  type PlannerProjectInput,
  type PlannerProjectStatus,
  type StudentPlannerItem,
} from "@/lib/student-planner";

type PlannerEditorKind = "event" | "project";

type PlannerItemDialogProps = {
  defaultDate: Date;
  item: StudentPlannerItem | null;
  locale: "en" | "ro";
  onDelete: (item: StudentPlannerItem) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onSaveEvent: (
    input: PlannerEventInput,
    existing: StudentPlannerItem | null
  ) => Promise<void>;
  onSaveProject: (
    input: PlannerProjectInput,
    existing: StudentPlannerItem | null
  ) => Promise<void>;
  open: boolean;
};

const colorClasses: Record<PlannerColor, string> = {
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
  slate: "bg-slate-500",
};

function toPickerValue(value: Date | string) {
  return format(new Date(value), "yyyy-MM-dd'T'HH:mm");
}

function defaultPickerValue(date: Date, hours: number) {
  const value = new Date(date);
  value.setHours(hours, 0, 0, 0);
  return toPickerValue(value);
}

function toIso(value: string, boundary?: "start" | "end") {
  const date = new Date(value);
  if (boundary === "start") date.setHours(0, 0, 0, 0);
  if (boundary === "end") date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

export function PlannerItemDialog({
  defaultDate,
  item,
  locale,
  onDelete,
  onOpenChange,
  onSaveEvent,
  onSaveProject,
  open,
}: PlannerItemDialogProps) {
  const ro = locale === "ro";
  const editing = Boolean(item);
  const [kind, setKind] = useState<PlannerEditorKind>("event");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [status, setStatus] =
    useState<PlannerProjectStatus>("planned");
  const [progress, setProgress] = useState(0);
  const [color, setColor] = useState<PlannerColor>("sky");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const nextKind = item?.source === "project" ? "project" : "event";
    setKind(nextKind);
    setTitle(item?.title || "");
    setDescription(item?.description || "");
    setAllDay(item?.allDay || false);
    setLocation(item?.location || "");
    setStart(
      item?.source === "event"
        ? toPickerValue(item.startsAt)
        : defaultPickerValue(defaultDate, 9)
    );
    setEnd(
      item?.source === "event"
        ? toPickerValue(item.endsAt)
        : defaultPickerValue(defaultDate, 10)
    );
    setDueAt(
      item?.source === "project"
        ? toPickerValue(item.endsAt)
        : defaultPickerValue(defaultDate, 17)
    );
    setStatus(
      item?.source === "project" &&
        (item.status === "planned" ||
          item.status === "in_progress" ||
          item.status === "completed")
        ? item.status
        : item?.source === "project"
          ? "in_progress"
          : "planned"
    );
    setProgress(item?.source === "project" ? item.progress || 0 : 0);
    setColor(item?.color || (nextKind === "project" ? "violet" : "sky"));
  }, [defaultDate, item, open]);

  const invalidDate = useMemo(() => {
    if (kind === "project") return !dueAt || Number.isNaN(Date.parse(dueAt));
    if (!start || !end) return true;
    return Date.parse(end) < Date.parse(start);
  }, [dueAt, end, kind, start]);

  async function save() {
    if (!title.trim() || invalidDate || saving) return;
    setSaving(true);
    try {
      if (kind === "event") {
        await onSaveEvent(
          {
            title: title.trim(),
            description,
            startsAt: toIso(start, allDay ? "start" : undefined),
            endsAt: toIso(end, allDay ? "end" : undefined),
            allDay,
            color,
            location,
          },
          item
        );
      } else {
        await onSaveProject(
          {
            title: title.trim(),
            description,
            dueAt: toIso(dueAt),
            status,
            progress: status === "completed" ? 100 : progress,
            color,
          },
          item
        );
      }
      onOpenChange(false);
    } catch {
      // The parent keeps the dialog open and surfaces the database error.
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!item || deleting) return;
    setDeleting(true);
    try {
      await onDelete(item);
      onOpenChange(false);
    } catch {
      // The parent keeps the dialog open and surfaces the database error.
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? ro
                ? "Editează în Planner"
                : "Edit in Planner"
              : ro
                ? "Adaugă în Planner"
                : "Add to Planner"}
          </DialogTitle>
          <DialogDescription>
            {ro
              ? "Păstrează evenimentele și proiectele lângă deadline-urile de la clasă."
              : "Keep events and projects beside your class deadlines."}
          </DialogDescription>
        </DialogHeader>

        {!editing && (
          <Tabs
            value={kind}
            onValueChange={(value) => {
              const next = value as PlannerEditorKind;
              setKind(next);
              setColor(next === "project" ? "violet" : "sky");
            }}
          >
            <TabsList className="grid h-9 w-full grid-cols-2">
              <TabsTrigger value="event">
                {ro ? "Eveniment" : "Event"}
              </TabsTrigger>
              <TabsTrigger value="project">
                <FolderKanban className="size-3.5" />
                {ro ? "Proiect" : "Project"}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <label htmlFor="planner-title" className="text-sm font-medium">
              {ro ? "Titlu" : "Title"}
            </label>
            <Input
              id="planner-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                kind === "project"
                  ? ro
                    ? "Ex. Proiect la informatică"
                    : "e.g. Computer science project"
                  : ro
                    ? "Ex. Recapitulare grafuri"
                    : "e.g. Review graph theory"
              }
              autoFocus
              maxLength={160}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="planner-description"
              className="text-sm font-medium"
            >
              {ro ? "Descriere" : "Description"}
              <span className="ml-1 font-normal text-muted-foreground">
                ({ro ? "opțional" : "optional"})
              </span>
            </label>
            <Textarea
              id="planner-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={5000}
            />
          </div>

          {kind === "event" ? (
            <>
              <div className="flex items-center justify-between rounded-xl bg-muted/45 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {ro ? "Toată ziua" : "All day"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ro ? "Ascunde orele în calendar" : "Hide times in the calendar"}
                  </p>
                </div>
                <Switch checked={allDay} onCheckedChange={setAllDay} />
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {ro ? "Începe" : "Starts"}
                  </label>
                  <DateTimePicker
                    locale={locale}
                    value={start}
                    onChange={setStart}
                    showTime={!allDay}
                    placeholder={ro ? "Alege data" : "Pick a date"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {ro ? "Se termină" : "Ends"}
                  </label>
                  <DateTimePicker
                    locale={locale}
                    value={end}
                    onChange={setEnd}
                    showTime={!allDay}
                    placeholder={ro ? "Alege data" : "Pick a date"}
                  />
                  {invalidDate && start && end && (
                    <p className="text-xs text-destructive">
                      {ro
                        ? "Ora de final trebuie să fie după început."
                        : "The end must be after the start."}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="planner-location" className="text-sm font-medium">
                  {ro ? "Locație" : "Location"}
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({ro ? "opțional" : "optional"})
                  </span>
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="planner-location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="pl-9"
                    maxLength={180}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {ro ? "Deadline" : "Deadline"}
                </label>
                <DateTimePicker
                  locale={locale}
                  value={dueAt}
                  onChange={setDueAt}
                  placeholder={ro ? "Alege deadline-ul" : "Pick a deadline"}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {ro ? "Stare" : "Status"}
                  </label>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      const next = value as PlannerProjectStatus;
                      setStatus(next);
                      if (next === "completed") setProgress(100);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">
                        {ro ? "Planificat" : "Planned"}
                      </SelectItem>
                      <SelectItem value="in_progress">
                        {ro ? "În lucru" : "In progress"}
                      </SelectItem>
                      <SelectItem value="completed">
                        {ro ? "Finalizat" : "Completed"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium">
                      {ro ? "Progres" : "Progress"}
                    </label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {progress}%
                    </span>
                  </div>
                  <Slider
                    value={[progress]}
                    onValueChange={(value) => {
                      const next = value[0] || 0;
                      setProgress(next);
                      if (next === 100) setStatus("completed");
                      else if (status === "completed") setStatus("in_progress");
                    }}
                    max={100}
                    step={5}
                    disabled={status === "completed"}
                    aria-label={ro ? "Progres proiect" : "Project progress"}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">{ro ? "Culoare" : "Color"}</p>
            <div className="flex flex-wrap gap-2">
              {plannerColors.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={option}
                  aria-pressed={color === option}
                  onClick={() => setColor(option)}
                  className={cn(
                    "size-7 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    colorClasses[option],
                    color === option && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          {item ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:text-destructive">
                  <Trash2 className="size-4" />
                  {ro ? "Șterge" : "Delete"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {ro ? "Ștergi acest element?" : "Delete this item?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {ro
                      ? "Acțiunea nu poate fi anulată."
                      : "This action cannot be undone."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{ro ? "Renunță" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={deleting}
                    onClick={() => void remove()}
                  >
                    {ro ? "Șterge" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <Button disabled={!title.trim() || invalidDate || saving} onClick={() => void save()}>
            {saving && <LoaderCircle className="size-4 animate-spin" />}
            {saving
              ? ro
                ? "Se salvează..."
                : "Saving..."
              : editing
                ? ro
                  ? "Salvează"
                  : "Save"
                : ro
                  ? "Adaugă"
                  : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
