"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import RouteGuard from "@/components/RouteGuard";
import { ProblemForm } from "@/components/admin/ProblemForm";
import { Skeleton } from "@/components/ui/skeleton";

function EditProblemContent() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id;

  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProblem() {
      const { data } = await supabase
        .from("problems")
        .select("*")
        .eq("id", id)
        .single();

      setProblem(data);
      setLoading(false);
    }

    if (id) fetchProblem();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="h-10 w-60 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!problem) {
    return <div className="p-6">Problem not found</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      <h1 className="text-2xl font-bold">Edit Problem</h1>

      <ProblemForm
        initialData={problem}
        onSuccess={() => router.push("/admin/problems")}
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