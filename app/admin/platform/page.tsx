"use client";
import { PlatformAccessForm } from "@/components/admin/PlatformAccessDialog";
import { useLanguage } from "@/components/LanguageProvider";
export default function PlatformAccessPage() {
  const { locale } = useLanguage();
  return <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6"><h1 className="text-2xl font-semibold">{locale === "ro" ? "Acces platformă" : "Platform access"}</h1><PlatformAccessForm /></div>;
}
