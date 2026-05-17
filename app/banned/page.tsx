"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";

export default function BannedPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const { locale } = useLanguage();

  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[locale];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("banned")
        .eq("id", user.id)
        .single();

      if (!profile?.banned) {
        router.replace("/");
        return;
      }

      setLoading(false);
    }

    check();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) return null;

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center rounded-[20px] bg-white p-6">

      <Card className="max-w-md w-full border-red-500/30 shadow-xl">
        <CardContent className="flex flex-col items-center text-center space-y-4 p-8">

          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-red-500/10">
            <Ban className="w-7 h-7 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-red-600">
            {t("banned.title")}
          </h1>

          <p className="text-sm text-muted-foreground">
            {t("banned.description")}
          </p>

          <Button
            onClick={logout}
            className="mt-2 bg-red-500 hover:bg-red-600"
          >
            {t("banned.logout")}
          </Button>

        </CardContent>
      </Card>

    </div>
  );
}