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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

import { Mail, Trash, Search, CheckCircle2, Eye } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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

function topicLabel(t: Topic) {
  switch (t) {
    case "bug": return "Bug";
    case "feature": return "Feature";
    case "account": return "Account";
    case "feedback": return "Feedback";
    case "other": return "Other";
  }
}

function topicStyle(t: Topic) {
  switch (t) {
    case "bug": return "bg-red-100 text-red-700";
    case "feature": return "bg-violet-100 text-violet-700";
    case "account": return "bg-amber-100 text-amber-700";
    case "feedback": return "bg-blue-100 text-blue-700";
    case "other": return "bg-zinc-100 text-zinc-700";
  }
}

function statusStyle(s: Status) {
  switch (s) {
    case "new": return "bg-emerald-100 text-emerald-700";
    case "read": return "bg-zinc-100 text-zinc-700";
    case "resolved": return "bg-blue-100 text-blue-700";
  }
}

function AdminContactContent() {
  const queryClient = useQueryClient();

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

    toast.success("Message deleted");
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
            Contact messages
            {newCount > 0 && (
              <Badge className="bg-rose-500 hover:bg-rose-600">{newCount} new</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Messages submitted from the contact form.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, content…"
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
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
            <h2 className="font-semibold">No messages</h2>
            <p className="text-sm text-muted-foreground">
              Nothing matches your current filters.
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
                      {m.status}
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
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg"
                    onClick={() => openMessage(m)}
                    title="View"
                  >
                    <Eye size={16} />
                  </Button>
                  {m.status !== "resolved" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg text-blue-600 hover:text-blue-700"
                      onClick={() => setStatus(m.id, "resolved")}
                      title="Mark as resolved"
                    >
                      <CheckCircle2 size={16} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg text-red-600 hover:text-red-700"
                    onClick={() => setDeleting(m)}
                    title="Delete"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewing && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${topicStyle(viewing.topic)}`}>
                  {topicLabel(viewing.topic)}
                </span>
              )}
              {viewing?.name}
            </DialogTitle>
            <DialogDescription>
              {viewing?.email} · {viewing ? new Date(viewing.created_at).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>

          {viewing && (
            <div className="space-y-4">
              <p className="whitespace-pre-wrap text-sm">{viewing.description}</p>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                <a href={`mailto:${viewing.email}?subject=Re: your message on ScripticX`}>
                  <Button variant="outline" size="sm">
                    <Mail size={14} className="mr-1" />
                    Reply by email
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
                    Mark resolved
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
                    Reopen
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
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the message from "{deleting?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
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
