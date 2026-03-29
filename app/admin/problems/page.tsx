"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import { useRouter } from "next/navigation";
import { getLocalized } from "@/lib/getLocalized";
import { useLanguage } from "@/components/LanguageProvider";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ProblemForm } from "@/components/admin/ProblemForm";

import { toast } from "sonner";

function AdminProblemsContent() {
  const router = useRouter();
  const { locale, t } = useLanguage();

  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  useEffect(() => {
    async function fetchProblems() {
      const { data } = await supabase
        .from("problems")
        .select("*")
        .order("created_at", { ascending: false });

      setProblems(data || []);
      setLoading(false);
    }

    fetchProblems();
  }, []);

  async function handleDelete() {
    if (!deleteId) return;

    const { error } = await supabase
      .from("problems")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error(t("admin.problems.toast.deleteError"));
      return;
    }

    setProblems((prev) => prev.filter((p) => p.id !== deleteId));
    setDeleteId(null);

    toast.success(t("admin.problems.toast.deleted"));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("admin.problems.manageTitle")}</h1>

        <Button onClick={() => setOpenCreate(true)}>
          {t("admin.problems.create")}
        </Button>
      </div>

      <div className="space-y-4">

        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}

        {!loading &&
          problems.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex justify-between items-center">

                <div>
                  <h2 className="font-semibold text-lg">
                    {getLocalized(p.title_i18n, locale)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {getLocalized(p.description_i18n, locale)}
                  </p>
                </div>

                <div className="flex gap-2">

                  <Button
                    variant="outline"
                    onClick={() => router.push(`/admin/problems/${p.id}`)}
                  >
                    {t("admin.problems.edit")}
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => setDeleteId(p.id)}
                  >
                    {t("admin.problems.delete")}
                  </Button>

                </div>

              </CardContent>
            </Card>
          ))}

      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.problems.dialog.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.problems.dialog.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.problems.dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("admin.problems.dialog.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.problems.dialog.createTitle")}</DialogTitle>
          </DialogHeader>

          <ProblemForm
            onSuccess={() => {
              setOpenCreate(false);
              window.location.reload();
            }}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function AdminProblemsPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminProblemsContent />
    </RouteGuard>
  );
}