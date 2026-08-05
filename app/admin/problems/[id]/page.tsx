"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import RouteGuard from "@/components/RouteGuard";
import { ProblemForm } from "@/components/admin/ProblemForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/LanguageProvider";

function EditProblemContent() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const id = typeof params?.id === "string" ? params.id : "";
  const { data: problem, isPending: loading } = useQuery({
    queryKey: ["admin", "problems", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("problems")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
  });

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="h-10 w-60 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!problem) {
    return <div className="p-6">{t("admin.problems.editPage.notFound")}</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      <h1 className="text-2xl font-bold">
        {t("admin.problems.editPage.title")}
      </h1>

      <ProblemForm
        initialData={problem}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ["admin", "problems"] });
          void queryClient.invalidateQueries({ queryKey: ["problems"] });
          router.push("/admin/problems");
        }}
      />

    </div>
  );
}

export default function EditProblemPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <EditProblemContent />
    </RouteGuard>
  );
}
