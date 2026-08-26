"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleCheckBig,
  Inbox,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Reply,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

import RouteGuard from "@/components/RouteGuard";
import { useLanguage } from "@/components/LanguageProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { authenticatedMailRequest } from "@/lib/mail-client";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Topic = "bug" | "feature" | "account" | "feedback" | "other";
type Status = "new" | "read" | "resolved";
type ReplyMode = "html" | "plain";

type ContactMessage = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  topic: Topic;
  description: string;
  status: Status;
  created_at: string;
};

type ReplyDraft = {
  content: string;
  mode: ReplyMode;
  senderLocalPart: string;
  senderName: string;
  subject: string;
};

const contactMessagesQueryKey = ["contact_messages"] as const;
const senderPattern = /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$/i;

async function fetchContactMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("id, user_id, name, email, topic, description, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ContactMessage[];
}

function formatDate(value: string, locale: "ro" | "en") {
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusVariant(status: Status): "outline" | "secondary" {
  return status === "resolved" ? "outline" : "secondary";
}

function AdminContactContent() {
  const { locale, t } = useLanguage();
  const queryClient = useQueryClient();
  const copy = locale === "ro"
    ? {
        inbox: "Inbox suport",
        inboxDescription: "Mesaje trimise prin formularul public de contact.",
        total: "Total mesaje",
        open: "În lucru",
        registered: "Conturi ScripticX",
        resolved: "Rezolvate",
        allTopics: "Toate subiectele",
        clearFilters: "Resetează filtrele",
        loadingError: "Mesajele nu au putut fi încărcate.",
        retry: "Încearcă din nou",
        noResults: "Nu există rezultate pentru filtrele selectate.",
        messageDetails: "Detalii mesaj",
        messageDescription: "Verifică solicitarea și răspunde dintr-o adresă ScripticX.",
        sender: "Expeditor",
        received: "Primit",
        response: "Răspuns",
        responseDescription: "Răspunsul este trimis prin infrastructura securizată de email.",
        fromName: "Nume expeditor",
        fromAddress: "Adresă expeditor",
        emailFormat: "Format email",
        subject: "Subiect email",
        body: "Mesaj",
        html: "Template HTML",
        plain: "Text simplu",
        send: "Trimite răspunsul",
        sending: "Se trimite…",
        replySent: "Răspunsul a fost trimis și solicitarea a fost rezolvată.",
        replyError: "Răspunsul nu a putut fi trimis.",
        replyRequired: "Completează subiectul și mesajul.",
        senderInvalid: "Introdu o adresă validă înainte de @scripticx.org.",
        sentFrom: "Răspunsul va fi trimis de la",
        registeredHint: "Utilizatorul va primi și o notificare în ScripticX.",
        guestHint: "Vizitatorul va primi răspunsul doar pe email.",
        deleteError: "Mesajul nu a putut fi șters.",
        statusError: "Starea mesajului nu a putut fi actualizată.",
      }
    : {
        inbox: "Support inbox",
        inboxDescription: "Messages submitted through the public contact form.",
        total: "Total messages",
        open: "Open",
        registered: "ScripticX accounts",
        resolved: "Resolved",
        allTopics: "All topics",
        clearFilters: "Clear filters",
        loadingError: "Contact messages could not be loaded.",
        retry: "Try again",
        noResults: "No messages match the selected filters.",
        messageDetails: "Message details",
        messageDescription: "Review the request and reply from a ScripticX address.",
        sender: "Sender",
        received: "Received",
        response: "Reply",
        responseDescription: "The reply is delivered through the secure email pipeline.",
        fromName: "Sender name",
        fromAddress: "Sender address",
        emailFormat: "Email format",
        subject: "Email subject",
        body: "Message",
        html: "HTML template",
        plain: "Plain text",
        send: "Send reply",
        sending: "Sending…",
        replySent: "The reply was delivered and the request was resolved.",
        replyError: "The reply could not be sent.",
        replyRequired: "Add a subject and reply message.",
        senderInvalid: "Enter a valid address before @scripticx.org.",
        sentFrom: "The reply will be sent from",
        registeredHint: "The user will also receive a ScripticX notification.",
        guestHint: "The visitor will receive the reply by email only.",
        deleteError: "The message could not be deleted.",
        statusError: "The message status could not be updated.",
      };

  const messagesQuery = useQuery({
    queryKey: contactMessagesQueryKey,
    queryFn: fetchContactMessages,
  });
  const messages = messagesQuery.data || [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [topicFilter, setTopicFilter] = useState<Topic | "all">("all");
  const [viewing, setViewing] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState<ContactMessage | null>(null);
  const [replyDraft, setReplyDraft] = useState<ReplyDraft | null>(null);
  const [sendingReply, setSendingReply] = useState(false);

  const topicLabel = (topic: Topic) => t(`admin.contact.topics.${topic}`);
  const statusLabel = (status: Status) => t(`admin.contact.statuses.${status}`);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return messages.filter((message) => {
      if (statusFilter !== "all" && message.status !== statusFilter) return false;
      if (topicFilter !== "all" && message.topic !== topicFilter) return false;
      if (!query) return true;
      return [message.name, message.email, message.description, topicLabel(message.topic)]
        .some((value) => value.toLocaleLowerCase().includes(query));
    });
  // topicLabel follows the active locale.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, search, statusFilter, topicFilter, locale]);

  const stats = [
    { icon: Inbox, label: copy.total, value: messages.length },
    { icon: MessageSquareText, label: copy.open, value: messages.filter((item) => item.status !== "resolved").length },
    { icon: UserRoundCheck, label: copy.registered, value: messages.filter((item) => item.user_id).length },
    { icon: CircleCheckBig, label: copy.resolved, value: messages.filter((item) => item.status === "resolved").length },
  ];

  function makeReplyDraft(message: ContactMessage): ReplyDraft {
    const firstName = message.name.trim().split(/\s+/)[0] || message.name;
    return locale === "ro"
      ? {
          senderName: "ScripticX Support",
          senderLocalPart: "support",
          mode: "html",
          subject: `Re: solicitarea ta ScripticX — ${topicLabel(message.topic)}`,
          content: `Salut, ${firstName}!\n\nÎți mulțumim pentru mesaj.\n\n\nCu bine,\nEchipa ScripticX`,
        }
      : {
          senderName: "ScripticX Support",
          senderLocalPart: "support",
          mode: "html",
          subject: `Re: your ScripticX request — ${topicLabel(message.topic)}`,
          content: `Hi, ${firstName}!\n\nThank you for contacting us.\n\n\nBest,\nThe ScripticX team`,
        };
  }

  async function setStatus(message: ContactMessage, status: Status) {
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", message.id);
    if (error) {
      toast.error(copy.statusError);
      return false;
    }
    queryClient.setQueryData<ContactMessage[]>(contactMessagesQueryKey, (current) =>
      current?.map((item) => item.id === message.id ? { ...item, status } : item) || []
    );
    setViewing((current) => current?.id === message.id ? { ...current, status } : current);
    return true;
  }

  function openMessage(message: ContactMessage) {
    setViewing(message);
    setReplyDraft(makeReplyDraft(message));
    if (message.status === "new") void setStatus(message, "read");
  }

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", deleting.id);
    if (error) {
      toast.error(copy.deleteError);
      return;
    }
    queryClient.setQueryData<ContactMessage[]>(contactMessagesQueryKey, (current) =>
      current?.filter((item) => item.id !== deleting.id) || []
    );
    setDeleting(null);
    toast.success(t("admin.contact.toast.deleted"));
  }

  async function sendReply() {
    if (!viewing || !replyDraft) return;
    const subject = replyDraft.subject.trim();
    const content = replyDraft.content.trim();
    if (!subject || !content || !replyDraft.senderName.trim()) {
      toast.error(copy.replyRequired);
      return;
    }
    if (!senderPattern.test(replyDraft.senderLocalPart.trim())) {
      toast.error(copy.senderInvalid);
      return;
    }

    setSendingReply(true);
    try {
      await authenticatedMailRequest<{ sent: true; status: Status }>(
        `/api/admin/contact/${encodeURIComponent(viewing.id)}/reply`,
        {
          method: "POST",
          body: JSON.stringify({
            ...replyDraft,
            senderLocalPart: replyDraft.senderLocalPart.trim(),
            senderName: replyDraft.senderName.trim(),
            subject,
            content,
            locale,
          }),
        }
      );
      queryClient.setQueryData<ContactMessage[]>(contactMessagesQueryKey, (current) =>
        current?.map((item) => item.id === viewing.id ? { ...item, status: "resolved" } : item) || []
      );
      setViewing((current) => current ? { ...current, status: "resolved" } : current);
      toast.success(copy.replySent);
      void queryClient.invalidateQueries({ queryKey: contactMessagesQueryKey });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.replyError);
    } finally {
      setSendingReply(false);
    }
  }

  const filtersActive = Boolean(search || statusFilter !== "all" || topicFilter !== "all");

  return (
    <main className="sx-page space-y-8 pb-16">
      <PageHeader
        title={t("admin.contact.title")}
        subtitle={t("admin.contact.subtitle")}
        meta={messages.some((message) => message.status === "new")
          ? <Badge variant="secondary">{t("admin.contact.newBadge").replace("{count}", String(messages.filter((message) => message.status === "new").length))}</Badge>
          : undefined}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="sx-surface flex items-center gap-4 p-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-[var(--sx-radius-control)] bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="truncate text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="sx-surface overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">{copy.inbox}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.inboxDescription}</p>
        </div>
        <div className="grid gap-3 border-b bg-muted/20 p-4 md:grid-cols-[minmax(240px,1fr)_180px_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("admin.contact.searchPlaceholder")} className="pl-9" />
          </label>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as Status | "all")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.contact.statusFilter.all")}</SelectItem>
              <SelectItem value="new">{t("admin.contact.statusFilter.new")}</SelectItem>
              <SelectItem value="read">{t("admin.contact.statusFilter.read")}</SelectItem>
              <SelectItem value="resolved">{t("admin.contact.statusFilter.resolved")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={topicFilter} onValueChange={(value) => setTopicFilter(value as Topic | "all")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allTopics}</SelectItem>
              {(["bug", "feature", "account", "feedback", "other"] as Topic[]).map((topic) => (
                <SelectItem key={topic} value={topic}>{topicLabel(topic)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {messagesQuery.isPending ? (
          <div className="space-y-3 p-5">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full" />)}</div>
        ) : messagesQuery.isError ? (
          <EmptyState className="px-5 py-16" icon={<Mail className="size-6" />} title={copy.loadingError} action={<Button variant="outline" onClick={() => void messagesQuery.refetch()}>{copy.retry}</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState
            className="px-5 py-16"
            icon={<Inbox className="size-6" />}
            title={messages.length ? copy.noResults : t("admin.contact.empty.title")}
            description={messages.length ? t("admin.contact.searchPlaceholder") : t("admin.contact.empty.subtitle")}
            action={filtersActive ? <Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); setTopicFilter("all"); }}>{copy.clearFilters}</Button> : undefined}
          />
        ) : (
          <div className="divide-y">
            {filtered.map((message) => (
              <article key={message.id} className={cn("grid gap-4 px-5 py-4 transition-colors hover:bg-muted/25 lg:grid-cols-[minmax(0,1fr)_180px_150px_auto] lg:items-center", message.status === "new" && "bg-primary/[0.025]")}>
                <button type="button" onClick={() => openMessage(message)} className="min-w-0 text-left">
                  <div className="flex min-w-0 items-center gap-2">
                    {message.status === "new" && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label={statusLabel("new")} />}
                    <h3 className="truncate font-semibold">{message.name}</h3>
                    <Badge variant="outline">{topicLabel(message.topic)}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{message.description}</p>
                  <p className="mt-2 truncate text-xs text-muted-foreground">{message.email}</p>
                </button>
                <div className="text-sm text-muted-foreground">
                  <p>{formatDate(message.created_at, locale)}</p>
                  <p className="mt-1 text-xs">{message.user_id ? copy.registeredHint : copy.guestHint}</p>
                </div>
                <div><Badge variant={statusVariant(message.status)}>{statusLabel(message.status)}</Badge></div>
                <div className="flex items-center gap-1 lg:justify-end">
                  <Button variant="ghost" size="icon-sm" onClick={() => openMessage(message)} aria-label={t("admin.contact.actions.view")}><Reply /></Button>
                  {message.status !== "resolved" ? (
                    <Button variant="ghost" size="icon-sm" onClick={() => void setStatus(message, "resolved")} aria-label={t("admin.contact.actions.markResolved")}><CheckCircle2 /></Button>
                  ) : (
                    <Button variant="ghost" size="icon-sm" onClick={() => void setStatus(message, "read")} aria-label={t("admin.contact.actions.reopen")}><RotateCcw /></Button>
                  )}
                  <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(message)} aria-label={t("admin.contact.actions.delete")}><Trash2 /></Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => { if (!open) { setViewing(null); setReplyDraft(null); } }}>
        <DialogContent className="note-scrollbar max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none gap-0 overflow-y-auto p-0 sm:max-w-[1050px]">
          {viewing && replyDraft && (
            <>
              <DialogHeader className="border-b px-6 py-5 pr-14">
                <DialogTitle>{copy.messageDetails}</DialogTitle>
                <DialogDescription>{copy.messageDescription}</DialogDescription>
              </DialogHeader>
              <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <section className="space-y-5 border-b p-6 lg:border-r lg:border-b-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{topicLabel(viewing.topic)}</Badge>
                    <Badge variant={statusVariant(viewing.status)}>{statusLabel(viewing.status)}</Badge>
                    {viewing.user_id && <Badge variant="secondary">{t("admin.contact.dialog.registeredBadge")}</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11"><AvatarFallback>{viewing.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold">{viewing.name}</p>
                      <a href={`mailto:${viewing.email}`} className="block truncate text-sm text-muted-foreground hover:text-foreground">{viewing.email}</a>
                    </div>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div><dt className="text-xs text-muted-foreground">{copy.sender}</dt><dd className="mt-1 truncate">{viewing.email}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">{copy.received}</dt><dd className="mt-1">{formatDate(viewing.created_at, locale)}</dd></div>
                  </dl>
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{t("admin.contact.dialog.messageLabel")}</p>
                    <div className="rounded-[var(--sx-radius-control)] border bg-muted/20 p-4"><p className="whitespace-pre-wrap text-sm leading-6">{viewing.description}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {viewing.status !== "resolved" ? (
                      <Button variant="outline" onClick={() => void setStatus(viewing, "resolved")}><CheckCircle2 />{t("admin.contact.actions.markResolved")}</Button>
                    ) : (
                      <Button variant="outline" onClick={() => void setStatus(viewing, "read")}><RotateCcw />{t("admin.contact.actions.reopen")}</Button>
                    )}
                    <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setDeleting(viewing); setViewing(null); }}><Trash2 />{t("admin.contact.actions.delete")}</Button>
                  </div>
                </section>

                <section className="space-y-5 p-6">
                  <div>
                    <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-muted-foreground" /><h3 className="font-semibold">{copy.response}</h3></div>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.responseDescription}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-sm font-medium"><span>{copy.fromName}</span><Input value={replyDraft.senderName} onChange={(event) => setReplyDraft({ ...replyDraft, senderName: event.target.value })} /></label>
                    <label className="space-y-1.5 text-sm font-medium">
                      <span>{copy.emailFormat}</span>
                      <Select value={replyDraft.mode} onValueChange={(value) => setReplyDraft({ ...replyDraft, mode: value as ReplyMode })}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="html">{copy.html}</SelectItem><SelectItem value="plain">{copy.plain}</SelectItem></SelectContent>
                      </Select>
                    </label>
                  </div>
                  <label className="space-y-1.5 text-sm font-medium">
                    <span>{copy.fromAddress}</span>
                    <div className="flex h-9 overflow-hidden rounded-[var(--sx-radius-control)] border border-input bg-background focus-within:ring-[3px] focus-within:ring-ring/50">
                      <input value={replyDraft.senderLocalPart} onChange={(event) => setReplyDraft({ ...replyDraft, senderLocalPart: event.target.value })} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" aria-label={copy.fromAddress} />
                      <span className="flex items-center border-l bg-muted/50 px-3 text-sm text-muted-foreground">@scripticx.org</span>
                    </div>
                  </label>
                  <label className="space-y-1.5 text-sm font-medium"><span>{copy.subject}</span><Input value={replyDraft.subject} onChange={(event) => setReplyDraft({ ...replyDraft, subject: event.target.value })} /></label>
                  <label className="space-y-1.5 text-sm font-medium"><span>{copy.body}</span><Textarea value={replyDraft.content} onChange={(event) => setReplyDraft({ ...replyDraft, content: event.target.value })} className="min-h-48 resize-y leading-6" /></label>
                  <div className="rounded-[var(--sx-radius-control)] border bg-muted/20 p-3 text-xs text-muted-foreground">
                    <p>{copy.sentFrom} <span className="font-medium text-foreground">{replyDraft.senderLocalPart || "support"}@scripticx.org</span>.</p>
                    <p className="mt-1">{viewing.user_id ? copy.registeredHint : copy.guestHint}</p>
                  </div>
                  <Button className="w-full" onClick={() => void sendReply()} disabled={sendingReply}>
                    {sendingReply ? <LoaderCircle className="animate-spin" /> : <Send />}{sendingReply ? copy.sending : copy.send}
                  </Button>
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.contact.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.contact.deleteDialog.description").replace("{name}", deleting?.name || "")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.contact.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("admin.contact.deleteDialog.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

export default function AdminContactPage() {
  return <RouteGuard requireAuth requireAdmin><AdminContactContent /></RouteGuard>;
}
