"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import RouteGuard from "@/components/RouteGuard";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

import { Plus, Pencil, Trash, ExternalLink } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { fetchUpdates, type UpdateEntry } from "@/lib/updates";
import { UpdateForm } from "@/components/admin/UpdateForm";
import { getLocalized } from "@/lib/getLocalized";
import { useLanguage } from "@/components/LanguageProvider";
import { toast } from "sonner";
import Link from "next/link";

function AdminUpdatesContent() {
  const queryClient = useQueryClient();
  const { locale, t } = useLanguage();

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["updates"],
    queryFn: fetchUpdates,
  });

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<UpdateEntry | null>(null);
  const [deleting, setDeleting] = useState<UpdateEntry | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["updates"] });
  }

  function openCreate() {
    setEditing(null);
    setOpenForm(true);
  }

  function openEdit(u: UpdateEntry) {
    setEditing(u);
    setOpenForm(true);
  }

  async function confirmDelete() {
    if (!deleting?.id) return;

    const { error } = await supabase
      .from("updates")
      .delete()
      .eq("id", deleting.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t("admin.updates.toast.deleted"));
    setDeleting(null);
    invalidate();
  }

  function tagStyle(tag: UpdateEntry["tag"]) {
    if (tag === "new") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300";
    if (tag === "fix") return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";
    if (tag === "improved") return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";
    return "bg-muted text-muted-foreground";
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("admin.updates.page.title")}</h1>
          <p className="text-muted-foreground">
            {t("admin.updates.page.subtitle")}
          </p>
        </div>

        <Button onClick={openCreate} className="rounded-xl">
          <Plus size={16} />
          {t("admin.updates.actions.new")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : updates.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <h2 className="font-semibold">{t("admin.updates.empty.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("admin.updates.empty.subtitle")}
            </p>
            <Button onClick={openCreate} className="rounded-xl">
              <Plus size={16} />
              {t("admin.updates.actions.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {updates.map((u) => (
            <Card key={u.id ?? u.slug}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    {u.tag && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${tagStyle(u.tag)}`}
                      >
                        {t(`admin.updates.form.tags.${u.tag}`)}
                      </span>
                    )}
                    <h2 className="truncate font-semibold">{getLocalized(u.title_i18n, locale)}</h2>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.date} · /updates/{u.slug}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/updates/${u.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="ghost" size="icon" className="rounded-lg">
                      <ExternalLink size={16} />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg"
                    onClick={() => openEdit(u)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleting(u)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t("admin.updates.dialog.editTitle")
                : t("admin.updates.dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <UpdateForm
            initialData={editing}
            onSaved={() => {
              setOpenForm(false);
              invalidate();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.updates.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.updates.deleteDialog.description").replace(
                "{title}",
                deleting ? getLocalized(deleting.title_i18n, locale) : ""
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.updates.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("admin.updates.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default function AdminUpdatesPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminUpdatesContent />
    </RouteGuard>
  );
}
