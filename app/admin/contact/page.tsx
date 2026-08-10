"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import RouteGuard from "@/components/RouteGuard";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Mail, Trash, Search, CheckCircle2, Eye, Clock, User } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";

type Topic = "bug" | "feature" | "account" | "feedback" | "other";
type Status = "new" | "read" | "resolved";

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

async function fetchContactMessages(): Promise<ContactMessage[]> {
  const { data } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  return (data as ContactMessage[]) || [];
}

function topicStyle(t: Topic) {
  switch (t) {
    case "bug": return "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300";
    case "feature": return "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300";
    case "account": return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";
    case "feedback": return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";
    case "other": return "bg-muted text-muted-foreground";
  }
}

function statusStyle(s: Status) {
  switch (s) {
    case "new": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300";
    case "read": return "bg-muted text-muted-foreground";
    case "resolved": return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";
  }
}

function AdminContactContent() {
  const { locale, t } = useLanguage();
  const queryClient = useQueryClient();

  const topicLabel = (topic: Topic) => t(`admin.contact.topics.${topic}`);
  const statusLabel = (status: Status) => t(`admin.contact.statuses.${status}`);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["contact_messages"],
    queryFn: fetchContactMessages,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [viewing, setViewing] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState<ContactMessage | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["contact_messages"] });
  }

  async function setStatus(id: string, status: Status) {
    const { error } = await supabase
      .from("contact_messages")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
  }

  async function openMessage(m: ContactMessage) {
    setViewing(m);
    if (m.status === "new") {
      await setStatus(m.id, "read");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;

    const { error } = await supabase
      .from("contact_messages")
      .delete()
      .eq("id", deleting.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t("admin.contact.toast.deleted"));
    setDeleting(null);
    invalidate();
  }

  const filtered = messages.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q)
    );
  });

  const newCount = messages.filter((m) => m.status === "new").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail size={24} className="text-rose-500" />
            {t("admin.contact.title")}
            {newCount > 0 && (
              <Badge className="bg-rose-500 hover:bg-rose-600">
                {t("admin.contact.newBadge").replace("{count}", String(newCount))}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.contact.subtitle")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.contact.searchPlaceholder")}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.contact.statusFilter.all")}</SelectItem>
            <SelectItem value="new">{t("admin.contact.statusFilter.new")}</SelectItem>
            <SelectItem value="read">{t("admin.contact.statusFilter.read")}</SelectItem>
            <SelectItem value="resolved">{t("admin.contact.statusFilter.resolved")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2">
            <h2 className="font-semibold">{t("admin.contact.empty.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("admin.contact.empty.subtitle")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Card
              key={m.id}
              className={m.status === "new" ? "border-emerald-500/30" : ""}
            >
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <button
                  type="button"
                  onClick={() => openMessage(m)}
                  className="min-w-0 flex-1 text-left space-y-1"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${topicStyle(m.topic)}`}>
                      {topicLabel(m.topic)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(m.status)}`}>
                      {statusLabel(m.status)}
                    </span>
                    <span className="truncate font-semibold">{m.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {m.email}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {m.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString(
                      locale === "ro" ? "ro-RO" : "en-US"
                    )}
                  </p>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg"
                    onClick={() => openMessage(m)}
                    title={t("admin.contact.actions.view")}
                  >
                    <Eye size={16} />
                  </Button>
                  {m.status !== "resolved" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg text-blue-600 hover:bg-blue-500/10 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      onClick={() => setStatus(m.id, "resolved")}
                      title={t("admin.contact.actions.markResolved")}
                    >
                      <CheckCircle2 size={16} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleting(m)}
                    title={t("admin.contact.actions.delete")}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="!p-0 sm:max-w-md overflow-hidden">
          {viewing && (
            <div className="flex flex-col">

              <div className="p-6 pb-5 border-b space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${topicStyle(viewing.topic)}`}>
                    {topicLabel(viewing.topic)}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle(viewing.status)}`}>
                    {statusLabel(viewing.status)}
                  </span>
                </div>

                <DialogTitle className="mt-0 text-xl">
                  {t("admin.contact.dialog.messageFrom").replace("{name}", viewing.name)}
                </DialogTitle>

                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {(viewing.name || "U")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <User size={14} className="text-muted-foreground" />
                      <span className="font-medium truncate">{viewing.name}</span>
                      {viewing.user_id && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {t("admin.contact.dialog.registeredBadge")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail size={12} />
                      <a
                        href={`mailto:${viewing.email}`}
                        className="truncate hover:underline"
                      >
                        {viewing.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>
                        {new Date(viewing.created_at).toLocaleString(
                          locale === "ro" ? "ro-RO" : "en-US"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("admin.contact.dialog.messageLabel")}
                </p>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {viewing.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 border-t bg-muted/20 px-6 py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setDeleting(viewing);
                    setViewing(null);
                  }}
                >
                  <Trash size={14} className="mr-1" />
                  {t("admin.contact.actions.delete")}
                </Button>

                <a href={`mailto:${viewing.email}?subject=${encodeURIComponent(t("admin.contact.replySubject"))}`}>
                  <Button variant="outline" size="sm">
                    <Mail size={14} className="mr-1" />
                    {t("admin.contact.actions.reply")}
                  </Button>
                </a>

                {viewing.status !== "resolved" ? (
                  <Button
                    size="sm"
                    onClick={async () => {
                      await setStatus(viewing.id, "resolved");
                      setViewing({ ...viewing, status: "resolved" });
                    }}
                  >
                    <CheckCircle2 size={14} className="mr-1" />
                    {t("admin.contact.actions.markResolved")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await setStatus(viewing.id, "read");
                      setViewing({ ...viewing, status: "read" });
                    }}
                  >
                    {t("admin.contact.actions.reopen")}
                  </Button>
                )}
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.contact.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.contact.deleteDialog.description").replace("{name}", deleting?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.contact.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("admin.contact.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default function AdminContactPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminContactContent />
    </RouteGuard>
  );
}
