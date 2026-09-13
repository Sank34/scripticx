"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, FileCode2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { ProblemForm } from "@/components/admin/ProblemForm";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { useLanguage } from "@/components/LanguageProvider";
import RouteGuard from "@/components/RouteGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocalized } from "@/lib/getLocalized";
import { supabase } from "@/lib/supabase";

function EditProblemContent() {
  const params = useParams();
  const router = useRouter();
  const { locale, t } = useLanguage();
  const queryClient = useQueryClient();
  const id = typeof params?.id === "string" ? params.id : "";
  const problemQuery = useQuery({
    queryKey: ["admin", "problems", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("problems").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
  });

  if (problemQuery.isPending) {
    return (
      <main className="sx-page space-y-7 pb-16">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-5 w-[min(100%,520px)]" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Skeleton className="h-[620px] rounded-[var(--sx-radius-card)]" />
          <Skeleton className="h-[440px] rounded-[var(--sx-radius-card)]" />
        </div>
      </main>
    );
  }

  const problem = problemQuery.data;
  if (!problem || problemQuery.isError) {
    return (
      <main className="sx-page grid min-h-[60vh] place-items-center">
        <EmptyState
          icon={<FileCode2 className="size-6" />}
          title={t("admin.problems.editPage.notFound")}
          action={(
            <Button asChild variant="outline">
              <Link href="/admin/problems"><ArrowLeft />{t("admin.problems.editPage.title")}</Link>
            </Button>
          )}
        />
      </main>
    );
  }

  const title = getLocalized(problem.title_i18n, locale);

  return (
    <main className="sx-page space-y-7 pb-16">
      <Button variant="outline" size="sm" asChild>
        <Link href="/admin/problems"><ArrowLeft />{t("admin.problems.manageTitle")}</Link>
      </Button>

      <PageHeader
        title={title || t("admin.problems.editPage.title")}
        subtitle={locale === "ro"
          ? "Configurează experiența publică, codul inițial și evaluarea automată."
          : "Configure the public experience, starter code, and automated evaluation."}
        meta={(
          <div className="flex items-center gap-2">
            {problem.code != null && <Badge variant="secondary">#{problem.code}</Badge>}
            <Badge variant="outline" className="capitalize">{problem.difficulty || "easy"}</Badge>
          </div>
        )}
        action={(
          <Button asChild variant="outline">
            <Link href={`/problems/${problem.id}`} target="_blank">
              <ExternalLink />
              {locale === "ro" ? "Vezi pagina publică" : "View public page"}
            </Link>
          </Button>
        )}
      />

      <ProblemForm
        initialData={problem}
        onCancel={() => router.push("/admin/problems")}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ["admin", "problems"] });
          void queryClient.invalidateQueries({ queryKey: ["admin", "problems", id] });
          void queryClient.invalidateQueries({ queryKey: ["problems"] });
        }}
      />
    </main>
  );
}

export default function EditProblemPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <EditProblemContent />
    </RouteGuard>
  );
}
