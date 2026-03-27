"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { useUserRole } from "@/hooks/useUserRole";
import { ProblemForm } from "@/components/admin/ProblemForm";
import { Skeleton } from "@/components/ui/skeleton";

function EditProblemContent({ user }: any) {
  const { role, loading: roleLoading } = useUserRole(user);

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

  if (roleLoading) return <div className="p-6">Loading...</div>;

  if (role !== "admin") {
    return <div className="p-6">Not authorized</div>;
  }

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
    <AuthGuard>
      {(user: any) => <EditProblemContent user={user} />}
    </AuthGuard>
  );
}