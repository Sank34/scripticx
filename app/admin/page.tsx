"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Users, FileText } from "lucide-react";

function AdminContent({ user }: any) {
  const { role, loading } = useUserRole(user);
  const router = useRouter();

  if (loading) return <div className="p-6">Loading...</div>;

  if (role !== "admin") {
    return <div className="p-6">Not authorized</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      <h1 className="text-3xl font-bold">Admin Panel</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <Card className="cursor-pointer hover:shadow-md transition">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold">Problems</h2>
            </div>

            <p className="text-sm text-muted-foreground">
              Create, edit and manage problems
            </p>

            <Button onClick={() => router.push("/admin/problems")}>
              Go to Problems
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition border-green-500/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-semibold">Users</h2>
            </div>

            <p className="text-sm text-muted-foreground">
              Manage users, roles and bans
            </p>

            <Button
              variant="default"
              className="bg-green-500 hover:bg-green-600"
              onClick={() => router.push("/admin/users")}
            >
              Manage Users
            </Button>
          </CardContent>
        </Card>

      </div>

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