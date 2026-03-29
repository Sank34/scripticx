"use client";

import RouteGuard from "@/components/RouteGuard";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Users, FileText } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

function AdminContent() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      <h1 className="text-3xl font-bold">{t("admin.title")}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <Card className="cursor-pointer hover:shadow-md transition">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold">{t("admin.problems.title")}</h2>
            </div>

            <p className="text-sm text-muted-foreground">
              {t("admin.problems.description")}
            </p>

            <Button onClick={() => router.push("/admin/problems")}>
              {t("admin.problems.action")}
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition border-green-500/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-semibold">{t("admin.users.title")}</h2>
            </div>

            <p className="text-sm text-muted-foreground">
              {t("admin.users.description")}
            </p>

            <Button
              variant="default"
              className="bg-green-500 hover:bg-green-600"
              onClick={() => router.push("/admin/users")}
            >
              {t("admin.users.action")}
            </Button>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}

export default function AdminPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminContent />
    </RouteGuard>
  );
}