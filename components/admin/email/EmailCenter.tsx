"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CircleAlert,
  Clock3,
  Copy,
  Eye,
  FileText,
  LoaderCircle,
  Mail,
  MailCheck,
  RefreshCw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { EmailPreview, type EmailPreviewMode } from "./EmailPreview";
import {
  createEmailCampaign,
  fetchEmailCampaigns,
  fetchEmailConfig,
  fetchEmailHistory,
  previewEmail,
  scheduleEmailCampaign,
  sendEmailCampaign,
  sendEmailCampaignTest,
  updateEmailCampaign,
  updateEmailConfig,
  type EmailAudience,
  type EmailCampaign,
  type EmailCampaignInput,
  type EmailCampaignStatus,
  type EmailConfig,
  type EmailContentMode,
} from "./adminEmailClient";

type Draft = {
  actionLabel: string;
  actionUrl: string;
  audienceType: "subscribers" | "segment" | "users";
  content: string;
  mode: EmailContentMode;
  name: string;
  preheader: string;
  replyTo: string;
  segment: "students" | "teachers" | "admins";
  senderLocalPart: string;
  senderName: string;
  subject: string;
  userIds: string;
};

const EMPTY_CONFIG: EmailConfig = {
  senderName: "ScripticX",
  senderLocalPart: "hello",
  replyTo: null,
  defaultMode: "html",
  contactNotificationsEnabled: true,
  transactionalEnabled: true,
  marketingEnabled: true,
  providerConfigured: false,
  senderDomain: "scripticx.org",
  updatedAt: "",
};

const SENDER_LOCAL_PART_PATTERN =
  /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function defaultContent(locale: "en" | "ro") {
  return locale === "ro"
    ? `Salut, {{first_name}}!

Avem ceva nou pregătit pentru tine în ScripticX. Continuă să înveți, să rezolvi probleme și să-ți construiești următorul proiect.

Ne vedem pe platformă,
Echipa ScripticX`
    : `Hi, {{first_name}}!

We have something new waiting for you in ScripticX. Keep learning, solving problems, and building your next project.

See you on the platform,
The ScripticX team`;
}

function newDraft(locale: "en" | "ro", config: EmailConfig): Draft {
  return {
    actionLabel: "",
    actionUrl: "",
    audienceType: "subscribers",
    content: defaultContent(locale),
    mode: config.defaultMode,
    name: "",
    preheader: "",
    replyTo: config.replyTo || "",
    segment: "students",
    senderLocalPart: config.senderLocalPart,
    senderName: config.senderName,
    subject: "",
    userIds: "",
  };
}

function draftFromCampaign(campaign: EmailCampaign): Draft {
  return {
    actionLabel: campaign.actionLabel || "",
    actionUrl: campaign.actionUrl || "",
    audienceType: campaign.audience.type,
    content: campaign.content,
    mode: campaign.mode,
    name: campaign.name,
    preheader: campaign.preheader || "",
    replyTo: campaign.replyTo || "",
    segment:
      campaign.audience.type === "segment"
        ? campaign.audience.segment
        : "students",
    senderLocalPart: campaign.senderLocalPart,
    senderName: campaign.senderName,
    subject: campaign.subject,
    userIds:
      campaign.audience.type === "users" ? campaign.audience.userIds.join("\n") : "",
  };
}

function audienceFromDraft(draft: Draft): EmailAudience {
  if (draft.audienceType === "segment") {
    return { type: "segment", segment: draft.segment };
  }
  if (draft.audienceType === "users") {
    return {
      type: "users",
      userIds: draft.userIds
        .split(/[\s,]+/)
        .map((id) => id.trim())
        .filter(Boolean),
    };
  }
  return { type: "subscribers" };
}

function campaignInput(draft: Draft): EmailCampaignInput {
  return {
    actionLabel: draft.actionLabel.trim() || null,
    actionUrl: draft.actionUrl.trim() || null,
    name: draft.name.trim(),
    subject: draft.subject.trim(),
    preheader: draft.preheader.trim() || undefined,
    content: draft.content,
    mode: draft.mode,
    audience: audienceFromDraft(draft),
    senderName: draft.senderName.trim(),
    senderLocalPart: draft.senderLocalPart.trim(),
    replyTo: draft.replyTo.trim() || null,
  };
}

function dateTimeLocalToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isoToDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function statusClass(status: EmailCampaignStatus | string) {
  switch (status) {
    case "sent":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300";
    case "scheduled":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";
    case "sending":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300";
    case "failed":
      return "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300";
    case "cancelled":
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";
  }
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
      {children}
    </label>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((row) => (
        <Skeleton key={row} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function EmailCenter() {
  const { locale, t } = useLanguage();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ["admin", "email", "config"],
    queryFn: fetchEmailConfig,
  });
  const campaignsQuery = useQuery({
    queryKey: ["admin", "email", "campaigns"],
    queryFn: fetchEmailCampaigns,
  });
  const historyQuery = useQuery({
    queryKey: ["admin", "email", "history"],
    queryFn: fetchEmailHistory,
  });

  const config = configQuery.data || EMPTY_CONFIG;
  const campaigns = campaignsQuery.data || [];
  const history = historyQuery.data || [];

  const [tab, setTab] = useState("compose");
  const [draft, setDraft] = useState<Draft>(() => newDraft(locale, EMPTY_CONFIG));
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<EmailPreviewMode>("desktop");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<EmailConfig>(EMPTY_CONFIG);
  const [previewPayload, setPreviewPayload] = useState(() => ({
    actionLabel: draft.actionLabel,
    actionUrl: draft.actionUrl,
    content: draft.content,
    mode: draft.mode,
    preheader: draft.preheader,
    senderName: draft.senderName,
    subject: draft.subject,
  }));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPreviewPayload({
        actionLabel: draft.actionLabel,
        actionUrl: draft.actionUrl,
        content: draft.content,
        mode: draft.mode,
        preheader: draft.preheader,
        senderName: draft.senderName,
        subject: draft.subject,
      });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [draft.actionLabel, draft.actionUrl, draft.content, draft.mode, draft.preheader, draft.senderName, draft.subject]);

  const previewQuery = useQuery({
    queryKey: ["admin", "email", "preview", locale, previewPayload],
    queryFn: () =>
      previewEmail({
        actionLabel: previewPayload.actionLabel.trim() || null,
        actionUrl: previewPayload.actionUrl.trim() || null,
        content: previewPayload.content,
        locale,
        mode: previewPayload.mode,
        preheader: previewPayload.preheader || undefined,
        senderName: previewPayload.senderName || undefined,
        subject: previewPayload.subject,
      }),
    enabled: Boolean(previewPayload.content.trim()),
    retry: false,
    staleTime: 30_000,
  });

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedId) || null;
  const isEditable = !selectedCampaign || ["draft", "scheduled"].includes(selectedCampaign.status);
  const isDirty = !selectedId || JSON.stringify(draft) !== savedSnapshot;

  useEffect(() => {
    if (!configQuery.data) return;
    setSettingsDraft(configQuery.data);
    if (!selectedId && !savedSnapshot) {
      const next = newDraft(locale, configQuery.data);
      setDraft(next);
      setSavedSnapshot(JSON.stringify(next));
    }
  }, [configQuery.data, locale, savedSnapshot, selectedId]);

  const audienceDescription = useMemo(() => {
    if (draft.audienceType === "segment") {
      return t("admin.emailCenter.compose.audience.segmentHint").replace(
        "{segment}",
        t(`admin.emailCenter.segments.${draft.segment}`)
      );
    }
    if (draft.audienceType === "users") {
      const count = audienceFromDraft(draft).type === "users"
        ? (audienceFromDraft(draft) as { type: "users"; userIds: string[] }).userIds.length
        : 0;
      return t("admin.emailCenter.compose.audience.usersHint").replace("{count}", String(count));
    }
    return t("admin.emailCenter.compose.audience.subscribersHint");
  }, [draft, t]);

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function validateDraft() {
    if (!draft.name.trim() || !draft.subject.trim() || !draft.content.trim()) {
      toast.error(t("admin.emailCenter.toast.required"));
      return false;
    }
    if (
      !SENDER_LOCAL_PART_PATTERN.test(draft.senderLocalPart.trim())
    ) {
      toast.error(t("admin.emailCenter.toast.senderInvalid"));
      return false;
    }
    if (draft.replyTo.trim() && !EMAIL_PATTERN.test(draft.replyTo.trim())) {
      toast.error(t("admin.emailCenter.toast.replyToInvalid"));
      return false;
    }
    const actionLabel = draft.actionLabel.trim();
    const actionUrl = draft.actionUrl.trim();
    if (Boolean(actionLabel) !== Boolean(actionUrl)) {
      toast.error(t("admin.emailCenter.toast.actionPair"));
      return false;
    }
    if (
      actionUrl &&
      !/^https:\/\//i.test(actionUrl) &&
      !/^\/(?!\/)/.test(actionUrl)
    ) {
      toast.error(t("admin.emailCenter.toast.actionUrlInvalid"));
      return false;
    }
    const audience = audienceFromDraft(draft);
    if (audience.type === "users" && audience.userIds.length === 0) {
      toast.error(t("admin.emailCenter.toast.usersRequired"));
      return false;
    }
    return true;
  }

  async function persistDraft(options?: { quiet?: boolean }) {
    if (!validateDraft()) return null;
    setPendingAction("save");
    try {
      const input = campaignInput(draft);
      const campaign = selectedId
        ? await updateEmailCampaign(selectedId, input)
        : await createEmailCampaign(input);
      setSelectedId(campaign.id);
      setDraft(draftFromCampaign(campaign));
      setSavedSnapshot(JSON.stringify(draftFromCampaign(campaign)));
      await queryClient.invalidateQueries({ queryKey: ["admin", "email", "campaigns"] });
      if (!options?.quiet) toast.success(t("admin.emailCenter.toast.draftSaved"));
      return campaign;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.emailCenter.toast.failed"));
      return null;
    } finally {
      setPendingAction(null);
    }
  }

  async function ensureSavedCampaign() {
    if (selectedCampaign && !isDirty) return selectedCampaign;
    return persistDraft({ quiet: true });
  }

  async function sendTest() {
    const campaign = await ensureSavedCampaign();
    if (!campaign) return;
    setPendingAction("test");
    try {
      await sendEmailCampaignTest(campaign.id, testRecipient.trim() || undefined);
      setTestOpen(false);
      setTestRecipient("");
      toast.success(t("admin.emailCenter.toast.testSent"));
      await queryClient.invalidateQueries({ queryKey: ["admin", "email", "history"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.emailCenter.toast.failed"));
    } finally {
      setPendingAction(null);
    }
  }

  async function scheduleCampaign() {
    const iso = dateTimeLocalToIso(scheduleAt);
    if (!iso || new Date(iso).getTime() <= Date.now()) {
      toast.error(t("admin.emailCenter.toast.scheduleInvalid"));
      return;
    }
    const campaign = await ensureSavedCampaign();
    if (!campaign) return;
    setPendingAction("schedule");
    try {
      const scheduled = await scheduleEmailCampaign(campaign.id, iso);
      setScheduleOpen(false);
      setSelectedId(scheduled.id);
      setDraft(draftFromCampaign(scheduled));
      setSavedSnapshot(JSON.stringify(draftFromCampaign(scheduled)));
      toast.success(t("admin.emailCenter.toast.scheduled"));
      await queryClient.invalidateQueries({ queryKey: ["admin", "email", "campaigns"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.emailCenter.toast.failed"));
    } finally {
      setPendingAction(null);
    }
  }

  async function sendNow() {
    const campaign = await ensureSavedCampaign();
    if (!campaign) return;
    setPendingAction("send");
    try {
      const result = await sendEmailCampaign(campaign.id);
      setSendOpen(false);
      toast.success(
        t("admin.emailCenter.toast.queued").replace("{count}", String(result.queued))
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "email", "campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "email", "history"] }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.emailCenter.toast.failed"));
    } finally {
      setPendingAction(null);
    }
  }

  async function saveSettings() {
    if (
      !settingsDraft.senderName.trim() ||
      !SENDER_LOCAL_PART_PATTERN.test(settingsDraft.senderLocalPart.trim())
    ) {
      toast.error(t("admin.emailCenter.toast.senderInvalid"));
      return;
    }
    if (
      settingsDraft.replyTo?.trim() &&
      !EMAIL_PATTERN.test(settingsDraft.replyTo.trim())
    ) {
      toast.error(t("admin.emailCenter.toast.replyToInvalid"));
      return;
    }
    setPendingAction("settings");
    try {
      const saved = await updateEmailConfig({
        senderName: settingsDraft.senderName.trim(),
        senderLocalPart: settingsDraft.senderLocalPart.trim(),
        replyTo: settingsDraft.replyTo?.trim() || null,
        defaultMode: settingsDraft.defaultMode,
        contactNotificationsEnabled: settingsDraft.contactNotificationsEnabled,
        transactionalEnabled: settingsDraft.transactionalEnabled,
        marketingEnabled: settingsDraft.marketingEnabled,
      });
      setSettingsDraft(saved);
      queryClient.setQueryData(["admin", "email", "config"], saved);
      toast.success(t("admin.emailCenter.toast.settingsSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.emailCenter.toast.failed"));
    } finally {
      setPendingAction(null);
    }
  }

  function startNew() {
    const next = newDraft(locale, config);
    setSelectedId(null);
    setDraft(next);
    setSavedSnapshot(JSON.stringify(next));
    setTab("compose");
  }

  function openCampaign(campaign: EmailCampaign) {
    const next = draftFromCampaign(campaign);
    setSelectedId(campaign.id);
    setDraft(next);
    setSavedSnapshot(JSON.stringify(next));
    setScheduleAt(campaign.scheduleAt ? isoToDateTimeLocal(campaign.scheduleAt) : "");
    setTab("compose");
  }

  function duplicateCampaign(campaign: EmailCampaign) {
    const next = {
      ...draftFromCampaign(campaign),
      name: `${campaign.name} (${t("admin.emailCenter.actions.copy")})`,
    };
    setSelectedId(null);
    setDraft(next);
    setSavedSnapshot("");
    setTab("compose");
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0">
            <Link href="/admin" aria-label={t("admin.emailCenter.actions.back")}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t("admin.emailCenter.title")}
              </h1>
              <Badge variant="secondary" className="gap-1">
                {configQuery.data?.providerConfigured ? (
                  <ShieldCheck className="size-3 text-emerald-500" />
                ) : (
                  <CircleAlert className="size-3 text-amber-500" />
                )}
                {configQuery.data
                  ? configQuery.data.providerConfigured
                    ? t("admin.emailCenter.provider.ready")
                    : t("admin.emailCenter.provider.missing")
                  : "Resend"}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t("admin.emailCenter.subtitle")}
            </p>
          </div>
        </div>
        <Button onClick={startNew} className="gap-2 self-start">
          <Sparkles className="size-4" />
          {t("admin.emailCenter.actions.newCampaign")}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="h-auto w-full justify-start overflow-x-auto border-b pb-0">
          <TabsTrigger value="compose" className="min-w-max px-3 py-2.5">
            <Mail className="size-4" />
            {t("admin.emailCenter.tabs.compose")}
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="min-w-max px-3 py-2.5">
            <FileText className="size-4" />
            {t("admin.emailCenter.tabs.campaigns")}
          </TabsTrigger>
          <TabsTrigger value="history" className="min-w-max px-3 py-2.5">
            <Clock3 className="size-4" />
            {t("admin.emailCenter.tabs.history")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="min-w-max px-3 py-2.5">
            <Settings2 className="size-4" />
            {t("admin.emailCenter.tabs.settings")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-3">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <Badge className={statusClass(selectedCampaign?.status || "draft")}>
                  {t(`admin.emailCenter.status.${selectedCampaign?.status || "draft"}`)}
                </Badge>
                <span className="truncate text-sm text-muted-foreground">
                  {isDirty ? t("admin.emailCenter.compose.unsaved") : t("admin.emailCenter.compose.saved")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setTestOpen(true)} disabled={!!pendingAction || !isEditable || !config.providerConfigured}>
                  <MailCheck className="size-4" />
                  {t("admin.emailCenter.actions.test")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)} disabled={!!pendingAction || !isEditable || !config.providerConfigured}>
                  <CalendarClock className="size-4" />
                  {t("admin.emailCenter.actions.schedule")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => void persistDraft()} disabled={!!pendingAction || !isDirty || !isEditable}>
                  {pendingAction === "save" ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {t("admin.emailCenter.actions.saveDraft")}
                </Button>
                <Button size="sm" onClick={() => setSendOpen(true)} disabled={!!pendingAction || !isEditable || !config.providerConfigured}>
                  <Send className="size-4" />
                  {t("admin.emailCenter.actions.sendNow")}
                </Button>
              </div>
            </div>

            <div className="grid min-h-[46rem] xl:grid-cols-[minmax(360px,0.82fr)_minmax(480px,1.18fr)]">
              <div className="space-y-5 border-b p-4 sm:p-5 xl:border-r xl:border-b-0">
                {!isEditable && selectedCampaign && (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                    <div className="flex gap-2 text-sm">
                      <Eye className="mt-0.5 size-4 shrink-0 text-blue-500" />
                      <span>{t("admin.emailCenter.compose.readOnly")}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => duplicateCampaign(selectedCampaign)}>
                      <Copy className="size-3.5" />
                      {t("admin.emailCenter.actions.duplicate")}
                    </Button>
                  </div>
                )}

                <section className="space-y-3">
                  <div>
                    <h2 className="font-semibold">{t("admin.emailCenter.compose.details.title")}</h2>
                    <p className="text-xs text-muted-foreground">{t("admin.emailCenter.compose.details.hint")}</p>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="campaign-name">{t("admin.emailCenter.compose.details.name")}</FieldLabel>
                    <Input id="campaign-name" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder={t("admin.emailCenter.compose.details.namePlaceholder")} disabled={!isEditable} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="sender-name">{t("admin.emailCenter.compose.details.senderName")}</FieldLabel>
                      <Input id="sender-name" value={draft.senderName} onChange={(event) => updateDraft("senderName", event.target.value)} disabled={!isEditable} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="sender-email">{t("admin.emailCenter.compose.details.senderEmail")}</FieldLabel>
                      <div className="flex h-8 overflow-hidden rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                        <input id="sender-email" className="min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none disabled:opacity-50" value={draft.senderLocalPart} onChange={(event) => updateDraft("senderLocalPart", event.target.value)} disabled={!isEditable} />
                        <span className="flex items-center border-l bg-muted/60 px-2 text-xs text-muted-foreground">@scripticx.org</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="reply-to">{t("admin.emailCenter.compose.details.replyTo")}</FieldLabel>
                    <Input id="reply-to" type="email" value={draft.replyTo} onChange={(event) => updateDraft("replyTo", event.target.value)} placeholder="support@scripticx.org" disabled={!isEditable} />
                  </div>
                </section>

                <section className="space-y-3 border-t pt-5">
                  <div>
                    <h2 className="font-semibold">{t("admin.emailCenter.compose.audience.title")}</h2>
                    <p className="text-xs text-muted-foreground">{t("admin.emailCenter.compose.audience.optInHint")}</p>
                  </div>
                  <Select value={draft.audienceType} onValueChange={(value) => updateDraft("audienceType", value as Draft["audienceType"])} disabled={!isEditable}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subscribers">{t("admin.emailCenter.compose.audience.subscribers")}</SelectItem>
                      <SelectItem value="segment">{t("admin.emailCenter.compose.audience.segment")}</SelectItem>
                      <SelectItem value="users">{t("admin.emailCenter.compose.audience.users")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {draft.audienceType === "segment" && (
                    <Select value={draft.segment} onValueChange={(value) => updateDraft("segment", value as Draft["segment"])} disabled={!isEditable}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="students">{t("admin.emailCenter.segments.students")}</SelectItem>
                        <SelectItem value="teachers">{t("admin.emailCenter.segments.teachers")}</SelectItem>
                        <SelectItem value="admins">{t("admin.emailCenter.segments.admins")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {draft.audienceType === "users" && (
                    <Textarea value={draft.userIds} onChange={(event) => updateDraft("userIds", event.target.value)} placeholder={t("admin.emailCenter.compose.audience.usersPlaceholder")} className="min-h-24 font-mono text-xs" disabled={!isEditable} />
                  )}
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Users className="mt-0.5 size-3.5 shrink-0" />
                    {audienceDescription}
                  </p>
                </section>

                <section className="space-y-3 border-t pt-5">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="email-subject">{t("admin.emailCenter.compose.content.subject")}</FieldLabel>
                    <Input id="email-subject" value={draft.subject} onChange={(event) => updateDraft("subject", event.target.value)} placeholder={t("admin.emailCenter.compose.content.subjectPlaceholder")} disabled={!isEditable} />
                    <p className="text-right text-[11px] text-muted-foreground">{draft.subject.length}/78</p>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="email-preheader">{t("admin.emailCenter.compose.content.preheader")}</FieldLabel>
                    <Input id="email-preheader" value={draft.preheader} onChange={(event) => updateDraft("preheader", event.target.value)} placeholder={t("admin.emailCenter.compose.content.preheaderPlaceholder")} disabled={!isEditable} />
                  </div>
                  <div className="grid gap-3 rounded-xl border bg-muted/20 p-3 sm:grid-cols-[0.8fr_1.2fr]">
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="email-action-label">{t("admin.emailCenter.compose.content.actionLabel")}</FieldLabel>
                      <Input id="email-action-label" value={draft.actionLabel} onChange={(event) => updateDraft("actionLabel", event.target.value)} placeholder={t("admin.emailCenter.compose.content.actionLabelPlaceholder")} disabled={!isEditable} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="email-action-url">{t("admin.emailCenter.compose.content.actionUrl")}</FieldLabel>
                      <Input id="email-action-url" value={draft.actionUrl} onChange={(event) => updateDraft("actionUrl", event.target.value)} placeholder="https://scripticx.org/learn or /learn" disabled={!isEditable} aria-describedby="email-action-url-hint" />
                    </div>
                    <p id="email-action-url-hint" className="text-[11px] text-muted-foreground sm:col-span-2">
                      {t("admin.emailCenter.compose.content.actionHint")}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium">{t("admin.emailCenter.compose.content.format")}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {draft.mode === "html" ? t("admin.emailCenter.compose.content.htmlHint") : t("admin.emailCenter.compose.content.plainHint")}
                      </p>
                    </div>
                    <div className="flex rounded-lg border bg-muted/30 p-0.5">
                      <Button type="button" size="sm" variant={draft.mode === "html" ? "secondary" : "ghost"} onClick={() => updateDraft("mode", "html")} disabled={!isEditable}>{t("admin.emailCenter.formats.pretty")}</Button>
                      <Button type="button" size="sm" variant={draft.mode === "plain" ? "secondary" : "ghost"} onClick={() => updateDraft("mode", "plain")} disabled={!isEditable}>{t("admin.emailCenter.formats.plain")}</Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5" aria-label={t("admin.emailCenter.compose.content.variables")}>
                    {["{{first_name}}", "{{username}}", "{{email}}", "{{action_url}}", "{{unsubscribe_url}}"].map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        className="rounded-md border bg-muted/30 px-2 py-1 font-mono text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                        onClick={() => updateDraft("content", `${draft.content}${draft.content ? "\n" : ""}${variable}`)}
                        disabled={!isEditable}
                        title={t("admin.emailCenter.compose.content.insertVariable")}
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                  <Textarea id="email-content" value={draft.content} onChange={(event) => updateDraft("content", event.target.value)} placeholder={t("admin.emailCenter.compose.content.plainPlaceholder")} className="min-h-72 resize-y text-sm leading-6" spellCheck disabled={!isEditable} />
                  {draft.mode === "html" && (
                    <p className="text-[11px] text-muted-foreground">{t("admin.emailCenter.compose.content.templateHint")}</p>
                  )}
                </section>
              </div>

              <EmailPreview
                contentMode={draft.mode}
                device={previewDevice}
                onDeviceChange={setPreviewDevice}
                html={previewQuery.data?.html || null}
                text={previewQuery.data?.text || ""}
                isLoading={previewQuery.isFetching}
                labels={{
                  desktop: t("admin.emailCenter.preview.desktop"),
                  mobile: t("admin.emailCenter.preview.mobile"),
                  preview: t("admin.emailCenter.preview.label"),
                }}
                emptyLabel={
                  previewQuery.isError
                    ? t("admin.emailCenter.preview.error")
                    : t("admin.emailCenter.preview.empty")
                }
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-3 space-y-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>{t("admin.emailCenter.campaigns.title")}</CardTitle>
              <CardDescription>{t("admin.emailCenter.campaigns.description")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {campaignsQuery.isPending ? <LoadingRows /> : campaignsQuery.isError ? (
                <div className="grid place-items-center gap-3 py-14 text-center">
                  <CircleAlert className="size-8 text-amber-500" />
                  <p className="text-sm text-muted-foreground">{t("admin.emailCenter.errors.load")}</p>
                  <Button variant="outline" size="sm" onClick={() => void campaignsQuery.refetch()}><RefreshCw className="size-4" />{t("admin.emailCenter.actions.retry")}</Button>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="grid place-items-center gap-3 py-14 text-center">
                  <Mail className="size-8 text-muted-foreground" />
                  <div><p className="font-medium">{t("admin.emailCenter.campaigns.emptyTitle")}</p><p className="text-sm text-muted-foreground">{t("admin.emailCenter.campaigns.emptyDescription")}</p></div>
                  <Button onClick={startNew}>{t("admin.emailCenter.actions.newCampaign")}</Button>
                </div>
              ) : (
                <div className="divide-y">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openCampaign(campaign)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{campaign.name}</p>
                          <Badge className={statusClass(campaign.status)}>{t(`admin.emailCenter.status.${campaign.status}`)}</Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{campaign.subject}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(campaign.updatedAt).toLocaleString(locale === "ro" ? "ro-RO" : "en-US")}
                          {campaign.scheduleAt ? ` · ${t("admin.emailCenter.campaigns.scheduledFor")} ${new Date(campaign.scheduleAt).toLocaleString(locale === "ro" ? "ro-RO" : "en-US")}` : ""}
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{campaign.sentCount}/{campaign.recipientCount} {t("admin.emailCenter.campaigns.accepted")}</p>
                          {campaign.failedCount > 0 && <p className="text-red-500">{campaign.failedCount} {t("admin.emailCenter.campaigns.failed")}</p>}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openCampaign(campaign)}>{campaign.status === "draft" || campaign.status === "scheduled" ? t("admin.emailCenter.actions.edit") : t("admin.emailCenter.actions.view")}</Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => duplicateCampaign(campaign)} aria-label={t("admin.emailCenter.actions.duplicate")}><Copy className="size-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-3">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>{t("admin.emailCenter.history.title")}</CardTitle>
              <CardDescription>{t("admin.emailCenter.history.description")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {historyQuery.isPending ? <LoadingRows /> : historyQuery.isError ? (
                <div className="grid place-items-center gap-3 py-14 text-center">
                  <CircleAlert className="size-8 text-amber-500" />
                  <p className="text-sm text-muted-foreground">{t("admin.emailCenter.errors.load")}</p>
                  <Button variant="outline" size="sm" onClick={() => void historyQuery.refetch()}><RefreshCw className="size-4" />{t("admin.emailCenter.actions.retry")}</Button>
                </div>
              ) : history.length === 0 ? (
                <div className="grid place-items-center gap-2 py-14 text-center"><Clock3 className="size-8 text-muted-foreground" /><p className="font-medium">{t("admin.emailCenter.history.emptyTitle")}</p><p className="text-sm text-muted-foreground">{t("admin.emailCenter.history.emptyDescription")}</p></div>
              ) : (
                <div className="divide-y">
                  {history.map((message) => (
                    <div key={message.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", message.status === "sent" ? "bg-emerald-500/10 text-emerald-600" : message.status === "failed" ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground")}>{message.status === "sent" ? <Check className="size-4" /> : message.status === "failed" ? <CircleAlert className="size-4" /> : <Clock3 className="size-4" />}</span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{message.subject}</p><p className="truncate text-xs text-muted-foreground">{message.recipient} · {message.kind}</p>{message.error && <p className="mt-1 text-xs text-red-500">{message.error}</p>}</div>
                      <div className="flex items-center gap-2 sm:block sm:text-right"><Badge className={statusClass(message.status)}>{message.status}</Badge><p className="text-xs text-muted-foreground sm:mt-1">{new Date(message.sentAt || message.createdAt).toLocaleString(locale === "ro" ? "ro-RO" : "en-US")}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-3">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.55fr)]">
            <Card>
              <CardHeader className="border-b"><CardTitle>{t("admin.emailCenter.settings.senderTitle")}</CardTitle><CardDescription>{t("admin.emailCenter.settings.senderDescription")}</CardDescription></CardHeader>
              <CardContent className="space-y-4 pt-4">
                {configQuery.isPending ? <LoadingRows /> : configQuery.isError ? (
                  <div className="grid place-items-center gap-3 py-12 text-center">
                    <CircleAlert className="size-8 text-amber-500" />
                    <p className="text-sm text-muted-foreground">{t("admin.emailCenter.errors.load")}</p>
                    <Button variant="outline" size="sm" onClick={() => void configQuery.refetch()}>
                      <RefreshCw className="size-4" />
                      {t("admin.emailCenter.actions.retry")}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5"><FieldLabel htmlFor="default-sender-name">{t("admin.emailCenter.compose.details.senderName")}</FieldLabel><Input id="default-sender-name" value={settingsDraft.senderName} onChange={(event) => setSettingsDraft((current) => ({ ...current, senderName: event.target.value }))} /></div>
                      <div className="space-y-1.5"><FieldLabel htmlFor="default-sender-email">{t("admin.emailCenter.compose.details.senderEmail")}</FieldLabel><div className="flex h-8 overflow-hidden rounded-lg border border-input"><input id="default-sender-email" className="min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none" value={settingsDraft.senderLocalPart} onChange={(event) => setSettingsDraft((current) => ({ ...current, senderLocalPart: event.target.value }))} /><span className="flex items-center border-l bg-muted/60 px-2 text-xs text-muted-foreground">@scripticx.org</span></div></div>
                    </div>
                    <div className="space-y-1.5"><FieldLabel htmlFor="default-reply-to">{t("admin.emailCenter.compose.details.replyTo")}</FieldLabel><Input id="default-reply-to" type="email" value={settingsDraft.replyTo || ""} onChange={(event) => setSettingsDraft((current) => ({ ...current, replyTo: event.target.value }))} placeholder="support@scripticx.org" /></div>
                    <div className="space-y-1.5"><FieldLabel htmlFor="default-format">{t("admin.emailCenter.settings.defaultFormat")}</FieldLabel><Select value={settingsDraft.defaultMode} onValueChange={(value) => setSettingsDraft((current) => ({ ...current, defaultMode: value as EmailContentMode }))}><SelectTrigger id="default-format" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="html">{t("admin.emailCenter.formats.pretty")}</SelectItem><SelectItem value="plain">{t("admin.emailCenter.formats.plain")}</SelectItem></SelectContent></Select></div>
                    <div className={cn("rounded-xl border p-3 text-sm", settingsDraft.providerConfigured ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5")}>
                      <p className={cn("flex items-center gap-2 font-medium", settingsDraft.providerConfigured ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>
                        {settingsDraft.providerConfigured ? <ShieldCheck className="size-4" /> : <CircleAlert className="size-4" />}
                        {settingsDraft.senderDomain}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {settingsDraft.providerConfigured ? t("admin.emailCenter.settings.domainHint") : t("admin.emailCenter.settings.providerMissingHint")}
                      </p>
                    </div>
                    <Button onClick={() => void saveSettings()} disabled={pendingAction === "settings"}>{pendingAction === "settings" ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{t("admin.emailCenter.actions.saveSettings")}</Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b"><CardTitle>{t("admin.emailCenter.settings.deliveryTitle")}</CardTitle><CardDescription>{t("admin.emailCenter.settings.deliveryDescription")}</CardDescription></CardHeader>
              <CardContent className="divide-y pt-1">
                {([
                  ["transactionalEnabled", "transactional"],
                  ["contactNotificationsEnabled", "contact"],
                  ["marketingEnabled", "marketing"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-start justify-between gap-4 py-4">
                    <span><span className="block text-sm font-medium">{t(`admin.emailCenter.settings.${label}Title`)}</span><span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{t(`admin.emailCenter.settings.${label}Hint`)}</span></span>
                    <Switch checked={settingsDraft[key]} onCheckedChange={(checked) => setSettingsDraft((current) => ({ ...current, [key]: checked }))} />
                  </label>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("admin.emailCenter.test.title")}</DialogTitle><DialogDescription>{t("admin.emailCenter.test.description")}</DialogDescription></DialogHeader>
          <div className="space-y-1.5"><FieldLabel htmlFor="test-recipient">{t("admin.emailCenter.test.recipient")}</FieldLabel><Input id="test-recipient" type="email" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder={t("admin.emailCenter.test.placeholder")} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setTestOpen(false)}>{t("admin.emailCenter.actions.cancel")}</Button><Button onClick={() => void sendTest()} disabled={pendingAction === "test"}>{pendingAction === "test" ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{t("admin.emailCenter.actions.sendTest")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("admin.emailCenter.schedule.title")}</DialogTitle><DialogDescription>{t("admin.emailCenter.schedule.description")}</DialogDescription></DialogHeader>
          <DateTimePicker value={scheduleAt} onChange={setScheduleAt} locale={locale} placeholder={t("admin.emailCenter.schedule.placeholder")} timeLabel={t("admin.emailCenter.schedule.time")} />
          <DialogFooter><Button variant="outline" onClick={() => setScheduleOpen(false)}>{t("admin.emailCenter.actions.cancel")}</Button><Button onClick={() => void scheduleCampaign()} disabled={pendingAction === "schedule"}>{pendingAction === "schedule" ? <LoaderCircle className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}{t("admin.emailCenter.actions.confirmSchedule")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={sendOpen} onOpenChange={setSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("admin.emailCenter.send.title")}</AlertDialogTitle><AlertDialogDescription>{t("admin.emailCenter.send.description")}</AlertDialogDescription></AlertDialogHeader>
          <div className="rounded-xl border bg-muted/30 p-3 text-sm"><p className="font-medium">{draft.subject || t("admin.emailCenter.send.noSubject")}</p><p className="mt-1 text-xs text-muted-foreground">{audienceDescription}</p></div>
          <AlertDialogFooter><AlertDialogCancel>{t("admin.emailCenter.actions.cancel")}</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void sendNow(); }} disabled={pendingAction === "send"}>{pendingAction === "send" ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{t("admin.emailCenter.actions.confirmSend")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
