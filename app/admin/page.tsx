"use client";
import { PlatformAccessDialog } from "@/components/admin/PlatformAccessDialog";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { AdminContent } from "@/components/admin/AdminOverviewContent";
export default function AdminPage() {
  const { isAdmin, can } = useAuth();
  const { locale } = useLanguage();
  return <div className="space-y-6">{(isAdmin || can("admin.platform")) && <div className="flex flex-wrap justify-end gap-2 px-6 pt-4">{can("admin.platform") && <PlatformAccessDialog />}{isAdmin && <Button variant="outline" asChild><Link href="/admin/roles">{locale === "ro" ? "Roluri și permisiuni" : "Roles & permissions"}</Link></Button>}</div>}<AdminContent /></div>;
}
