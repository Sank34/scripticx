"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { useUserRole } from "@/hooks/useUserRole";
import { ProblemForm } from "@/components/admin/ProblemForm";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function AdminContent({ user }: any) {
  const { role, loading: roleLoading } = useUserRole(user);

  if (roleLoading) return <div className="p-6">Loading...</div>;

  if (role !== "admin") {
    return <div className="p-6">Not authorized</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      <h1 className="text-3xl font-bold">Admin Panel</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create Problem</CardTitle>
        </CardHeader>

        <CardContent>
          <ProblemForm
            onSuccess={() => {
              // optional refresh
              window.location.reload();
            }}
          />
        </CardContent>
      </Card>

    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard>
      {(user: any) => <AdminContent user={user} />}
    </AuthGuard>
  );
}