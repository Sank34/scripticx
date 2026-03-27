"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AuthGuard } from "@/components/AuthGuard";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";



import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

import { toast } from "sonner";

function AdminProblemsContent({ user }: any) {
  const router = useRouter();
  const { role, loading: roleLoading } = useUserRole(user);

  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      toast.error("Failed to delete problem");
      return;
    }

    setProblems((prev) => prev.filter((p) => p.id !== deleteId));
    setDeleteId(null);

    toast.success("Problem deleted");
  }

  if (roleLoading) return <div className="p-6">Loading...</div>;

  if (role !== "admin") {
    return <div className="p-6">Not authorized</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <h1 className="text-3xl font-bold">Manage Problems</h1>

      {/* LIST */}
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
                  <h2 className="font-semibold text-lg">{p.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {p.description}
                  </p>
                </div>

                <div className="flex gap-2">

                  {/* EDIT */}
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/admin/problems/${p.id}`)}
                    >
                    Edit
                  </Button>

                  {/* DELETE */}
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteId(p.id)}
                  >
                    Delete
                  </Button>

                </div>

              </CardContent>
            </Card>
          ))}

      </div>

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete problem?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default function AdminProblemsPage() {
  return (
    <AuthGuard>
      {(user: any) => <AdminProblemsContent user={user} />}
    </AuthGuard>
  );
}