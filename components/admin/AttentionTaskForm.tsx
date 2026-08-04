"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { isValidTaskLink, type AdminTask } from "@/lib/adminTasks";
import { createAdminTask, updateAdminTask } from "@/lib/adminTasksData";

import type { AttentionSeverity } from "@/lib/adminOverview";

type Props = {
  initialData?: AdminTask | null;
  onCancel: () => void;
  onSuccess: () => void;
};

export function AttentionTaskForm({ initialData, onCancel, onSuccess }: Props) {
  const { t } = useLanguage();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [link, setLink] = useState(initialData?.link ?? "");
  const [severity, setSeverity] = useState<AttentionSeverity>(
    initialData?.severity ?? "warn"
  );
  const [saving, setSaving] = useState(false);

  const linkIsValid = isValidTaskLink(link);
  const canSubmit = title.trim().length > 0 && linkIsValid && !saving;

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error(t("admin.overview.attention.tasks.form.validation.title"));
      return;
    }

    if (!linkIsValid) {
      toast.error(t("admin.overview.attention.tasks.form.validation.link"));
      return;
    }

    const input = { description, link, severity, title };
    setSaving(true);

    try {
      if (initialData) {
        await updateAdminTask(initialData.id, input);
        toast.success(t("admin.overview.attention.tasks.toast.updated"));
      } else {
        await createAdminTask(input);
        toast.success(t("admin.overview.attention.tasks.toast.created"));
      }

      onSuccess();
    } catch {
      toast.error(t("admin.overview.attention.tasks.toast.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="attention-task-title">
          {t("admin.overview.attention.tasks.form.title")}
        </label>
        <Input
          autoFocus
          id="attention-task-title"
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("admin.overview.attention.tasks.form.titlePlaceholder")}
          value={title}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="attention-task-description">
          {t("admin.overview.attention.tasks.form.description")}
        </label>
        <Textarea
          id="attention-task-description"
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t(
            "admin.overview.attention.tasks.form.descriptionPlaceholder"
          )}
          rows={3}
          value={description}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="attention-task-link">
          {t("admin.overview.attention.tasks.form.link")}
        </label>
        <Input
          id="attention-task-link"
          onChange={(event) => setLink(event.target.value)}
          placeholder={t("admin.overview.attention.tasks.form.linkPlaceholder")}
          value={link}
        />
        {!linkIsValid && (
          <p className="text-xs text-destructive">
            {t("admin.overview.attention.tasks.form.validation.link")}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">
          {t("admin.overview.attention.tasks.form.severity")}
        </p>
        <Select
          onValueChange={(value) => setSeverity(value as AttentionSeverity)}
          value={severity}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="warn">
              {t("admin.overview.attention.tasks.form.severityWarn")}
            </SelectItem>
            <SelectItem value="info">
              {t("admin.overview.attention.tasks.form.severityInfo")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button onClick={onCancel} type="button" variant="outline">
          {t("admin.overview.attention.tasks.form.cancel")}
        </Button>
        <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
          {saving
            ? t("admin.overview.attention.tasks.form.saving")
            : initialData
              ? t("admin.overview.attention.tasks.form.update")
              : t("admin.overview.attention.tasks.form.create")}
        </Button>
      </div>
    </div>
  );
}
