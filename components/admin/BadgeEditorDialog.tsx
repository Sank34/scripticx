"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { toast } from "sonner";

import { AchievementIcon } from "@/components/achievements/AchievementBadgeCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  BADGE_ICON_NAMES,
  RARITY_STYLES,
  type BadgeRuleMetric,
  type BadgeDefinition,
  type BadgeTrigger,
  type RewardRarity,
} from "@/lib/rewards";
import { cn } from "@/lib/utils";
import { uploadBadgeIcon } from "@/lib/rewardsData";

const MAX_ICON_SIZE = 1024 * 1024;

function emptyBadge(): BadgeDefinition {
  return {
    id: "",
    key: "",
    title: "",
    description: "",
    iconName: "award",
    rarity: "common",
    trigger: "manual",
    active: true,
    recipients: 0,
  };
}

export function BadgeEditorDialog({
  badge,
  locale,
  onOpenChange,
  onSave,
  open,
}: {
  badge: BadgeDefinition | null;
  locale: "en" | "ro";
  onOpenChange: (open: boolean) => void;
  onSave: (badge: BadgeDefinition) => Promise<void>;
  open: boolean;
}) {
  const [draft, setDraft] = useState<BadgeDefinition>(emptyBadge);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const copy = locale === "ro"
    ? {
        create: "Creează badge",
        edit: "Editează badge",
        subtitle: "Configurează identitatea, iconul și modul în care va fi acordat.",
        title: "Nume badge",
        titlePlaceholder: "Ex: Participant CodeCamp 2026",
        key: "Cheie unică",
        keyPlaceholder: "event_codecamp_2026",
        keyHint: "Folosită ulterior de reguli și de integrarea cu backend-ul.",
        description: "Descriere",
        descriptionPlaceholder: "De ce și când primește un elev acest badge?",
        rarity: "Raritate",
        trigger: "Mod de acordare",
        event: "Nume eveniment",
        eventPlaceholder: "Ex: CodeCamp 2026",
        ruleTitle: "Regulă automată",
        ruleMetric: "Se acordă în funcție de",
        ruleThreshold: "Prag",
        ruleHint: "Badge-ul se acordă o singură dată, imediat după o acțiune verificată de server.",
        status: "Badge activ",
        statusHint: "Badge-urile inactive rămân în sistem, dar nu mai pot fi acordate.",
        preset: "Alege un icon",
        custom: "Icon custom",
        customHint: "Încarcă PNG, JPG, WebP sau SVG de maximum 1 MB, ori adaugă un URL.",
        iconUrl: "URL icon",
        upload: "Încarcă fișier",
        removeCustom: "Folosește icon presetat",
        preview: "Preview",
        cancel: "Anulează",
        save: "Salvează badge-ul",
        required: "Numele și cheia unică sunt obligatorii.",
        invalidKey: "Cheia poate conține doar litere mici, cifre și underscore.",
        invalidRule: "Alege o regulă și un prag întreg între 1 și 1.000.000.",
        badFile: "Alege o imagine PNG, JPG, WebP sau SVG de maximum 1 MB.",
        uploadFailed: "Iconul nu a putut fi încărcat.",
        uploaded: "Icon încărcat.",
        saveFailed: "Badge-ul nu a putut fi salvat.",
        triggers: {
          automatic: "Automat (regulă)",
          event: "Eveniment",
          manual: "Manual",
        },
        ruleMetrics: {
          problems_solved: "Probleme rezolvate cu 100%",
          perfect_submissions: "Submisii cu punctaj 100%",
          submissions_sent: "Submisii verificate trimise",
          total_score: "Puncte totale pe platformă",
          daily_challenges: "Daily challenges finalizate",
          competition_participations: "Competiții la care a participat",
          competition_problems_solved: "Probleme de concurs rezolvate",
        } as Record<BadgeRuleMetric, string>,
      }
    : {
        create: "Create badge",
        edit: "Edit badge",
        subtitle: "Configure its identity, icon, and award method.",
        title: "Badge name",
        titlePlaceholder: "Example: CodeCamp 2026 participant",
        key: "Unique key",
        keyPlaceholder: "event_codecamp_2026",
        keyHint: "Used later by rules and the backend integration.",
        description: "Description",
        descriptionPlaceholder: "Why and when does a student receive this badge?",
        rarity: "Rarity",
        trigger: "Award method",
        event: "Event name",
        eventPlaceholder: "Example: CodeCamp 2026",
        ruleTitle: "Automatic rule",
        ruleMetric: "Award based on",
        ruleThreshold: "Threshold",
        ruleHint: "The badge is awarded once, immediately after a server-verified action.",
        status: "Active badge",
        statusHint: "Inactive badges stay in the system but can no longer be awarded.",
        preset: "Choose an icon",
        custom: "Custom icon",
        customHint: "Upload a PNG, JPG, WebP or SVG up to 1 MB, or add a URL.",
        iconUrl: "Icon URL",
        upload: "Upload file",
        removeCustom: "Use preset icon",
        preview: "Preview",
        cancel: "Cancel",
        save: "Save badge",
        required: "Badge name and unique key are required.",
        invalidKey: "The key can only contain lowercase letters, numbers, and underscores.",
        invalidRule: "Choose a rule and an integer threshold between 1 and 1,000,000.",
        badFile: "Choose a PNG, JPG, WebP or SVG image up to 1 MB.",
        uploadFailed: "The icon could not be uploaded.",
        uploaded: "Icon uploaded.",
        saveFailed: "The badge could not be saved.",
        triggers: {
          automatic: "Automatic (rule)",
          event: "Event",
          manual: "Manual",
        },
        ruleMetrics: {
          problems_solved: "Problems solved with 100%",
          perfect_submissions: "Submissions scoring 100%",
          submissions_sent: "Verified submissions sent",
          total_score: "Total platform points",
          daily_challenges: "Daily challenges completed",
          competition_participations: "Competitions joined",
          competition_problems_solved: "Competition problems solved",
        } as Record<BadgeRuleMetric, string>,
      };

  useEffect(() => {
    if (!open) return;
    setDraft(badge ? { ...badge } : emptyBadge());
    setError("");
    setSaving(false);
    setUploadingIcon(false);
  }, [badge, open]);

  function update<K extends keyof BadgeDefinition>(key: K, value: BadgeDefinition[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function updateTrigger(trigger: BadgeTrigger) {
    setDraft((current) => ({
      ...current,
      trigger,
      automaticRule: trigger === "automatic"
        ? current.automaticRule || { metric: "problems_solved", threshold: 1 }
        : current.automaticRule,
    }));
    setError("");
  }

  async function handleIconFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const accepted = ["image/png", "image/jpeg", "image/webp"];
    if (!accepted.includes(file.type) || file.size > MAX_ICON_SIZE) {
      toast.error(copy.badFile);
      event.target.value = "";
      return;
    }

    setUploadingIcon(true);
    try {
      update("iconUrl", await uploadBadgeIcon(file));
      toast.success(copy.uploaded);
    } catch {
      toast.error(copy.uploadFailed);
    } finally {
      setUploadingIcon(false);
      event.target.value = "";
    }
  }

  async function submit() {
    const title = draft.title.trim();
    const key = draft.key.trim();

    if (!title || !key) {
      setError(copy.required);
      return;
    }
    if (!/^[a-z0-9_]+$/.test(key)) {
      setError(copy.invalidKey);
      return;
    }
    if (
      draft.trigger === "automatic" &&
      (!draft.automaticRule ||
        !Number.isInteger(draft.automaticRule.threshold) ||
        draft.automaticRule.threshold < 1 ||
        draft.automaticRule.threshold > 1_000_000)
    ) {
      setError(copy.invalidRule);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...draft,
        title,
        key,
        description: draft.description.trim(),
        eventName: draft.trigger === "event" ? draft.eventName?.trim() : undefined,
        automaticRule: draft.trigger === "automatic" ? draft.automaticRule : undefined,
      });
    } catch {
      setError(copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{badge ? copy.edit : copy.create}</DialogTitle>
          <DialogDescription>{copy.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-1 sm:grid-cols-[1fr_190px]">
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{copy.title}</span>
              <Input
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder={copy.titlePlaceholder}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{copy.key}</span>
              <Input
                value={draft.key}
                onChange={(event) => update(
                  "key",
                  event.target.value.toLowerCase().replace(/[\s-]+/g, "_")
                )}
                placeholder={copy.keyPlaceholder}
                className="font-mono"
              />
              <span className="block text-xs text-muted-foreground">{copy.keyHint}</span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{copy.description}</span>
              <Textarea
                value={draft.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder={copy.descriptionPlaceholder}
                className="min-h-24 resize-y"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">{copy.rarity}</span>
                <Select
                  value={draft.rarity}
                  onValueChange={(value) => update("rarity", value as RewardRarity)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["common", "rare", "epic", "legendary"] as RewardRarity[]).map((rarity) => (
                      <SelectItem key={rarity} value={rarity}>
                        <span className="capitalize">{rarity}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">{copy.trigger}</span>
                <Select
                  value={draft.trigger}
                  onValueChange={(value) => updateTrigger(value as BadgeTrigger)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(copy.triggers) as BadgeTrigger[]).map((trigger) => (
                      <SelectItem key={trigger} value={trigger}>{copy.triggers[trigger]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            {draft.trigger === "event" && (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">{copy.event}</span>
                <Input
                  value={draft.eventName || ""}
                  onChange={(event) => update("eventName", event.target.value)}
                  placeholder={copy.eventPlaceholder}
                />
              </label>
            )}

            {draft.trigger === "automatic" && (
              <div className="space-y-3 rounded-xl border bg-muted/60 p-3">
                <div>
                  <p className="text-sm font-medium">{copy.ruleTitle}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {copy.ruleHint}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-foreground/80">{copy.ruleMetric}</span>
                    <Select
                      value={draft.automaticRule?.metric || "problems_solved"}
                      onValueChange={(value) => update("automaticRule", {
                        metric: value as BadgeRuleMetric,
                        threshold: draft.automaticRule?.threshold || 1,
                      })}
                    >
                      <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(copy.ruleMetrics) as BadgeRuleMetric[]).map((metric) => (
                          <SelectItem key={metric} value={metric}>{copy.ruleMetrics[metric]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-foreground/80">{copy.ruleThreshold}</span>
                    <Input
                      type="number"
                      min={1}
                      max={1_000_000}
                      step={1}
                      inputMode="numeric"
                      value={draft.automaticRule?.threshold || 1}
                      onChange={(event) => update("automaticRule", {
                        metric: draft.automaticRule?.metric || "problems_solved",
                        threshold: Number(event.target.value),
                      })}
                      className="bg-background"
                    />
                  </label>
                </div>
              </div>
            )}

            <button
              type="button"
              aria-pressed={draft.active}
              onClick={() => update("active", !draft.active)}
              className="flex w-full items-center justify-between gap-4 rounded-xl border p-3 text-left transition hover:bg-accent/70"
            >
              <span>
                <span className="block text-sm font-medium">{copy.status}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{copy.statusHint}</span>
              </span>
              <span
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition",
                  draft.active ? "bg-emerald-500" : "bg-muted-foreground/35"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 size-4 rounded-full bg-white shadow-sm transition",
                    draft.active ? "left-6" : "left-1"
                  )}
                />
              </span>
            </button>
          </div>

          <aside className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">{copy.preview}</p>
              <div className={cn("rounded-2xl border p-4 text-center", RARITY_STYLES[draft.rarity].card)}>
                <div className={cn("mx-auto flex size-16 items-center justify-center rounded-2xl", RARITY_STYLES[draft.rarity].glow)}>
                  <AchievementIcon
                    iconName={draft.iconName}
                    iconUrl={draft.iconUrl}
                    className="size-8"
                  />
                </div>
                <p className="mt-3 truncate font-semibold">{draft.title || copy.title}</p>
                <Badge variant="outline" className={cn("mt-2 capitalize", RARITY_STYLES[draft.rarity].badge)}>
                  {draft.rarity}
                </Badge>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{copy.preset}</p>
              <div className="grid grid-cols-5 gap-1.5">
                {BADGE_ICON_NAMES.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    title={iconName}
                    onClick={() => {
                      update("iconName", iconName);
                      update("iconUrl", undefined);
                    }}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg border transition hover:bg-accent",
                      draft.iconName === iconName && !draft.iconUrl
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    <AchievementIcon iconName={iconName} className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-dashed p-3">
              <div className="flex items-center gap-2">
                <ImagePlus className="size-4 text-violet-500" />
                <p className="text-sm font-medium">{copy.custom}</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{copy.customHint}</p>
              <Input
                value={draft.iconUrl || ""}
                onChange={(event) => update("iconUrl", event.target.value || undefined)}
                placeholder={copy.iconUrl}
              />
              <label className="flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-background text-xs font-medium transition hover:bg-accent">
                <Upload className="size-3.5" />
                {uploadingIcon ? "..." : copy.upload}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => void handleIconFile(event)}
                  disabled={uploadingIcon}
                  className="sr-only"
                />
              </label>
              {draft.iconUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => update("iconUrl", undefined)}
                >
                  {copy.removeCustom}
                </Button>
              )}
            </div>
          </aside>
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button onClick={() => void submit()} disabled={saving || uploadingIcon}>
            {saving ? "..." : copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
