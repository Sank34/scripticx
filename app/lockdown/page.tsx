"use client";

import { useQuery } from "@tanstack/react-query";
import { LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

type PlatformStatus = {
  lockdownEnabled: boolean;
  message?: string | null;
};

function LockdownContent() {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, loading } = useAuth();
  const [checking, setChecking] = useState(false);
  const statusQuery = useQuery<PlatformStatus>({
    queryKey: ["platform-status"],
    queryFn: async () => {
      const response = await fetch("/api/platform/status", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not read platform status");
      return response.json();
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
  const storedMessage = statusQuery.data?.message?.trim();
  const legacyDefaultMessage =
    storedMessage === "Platforma este temporar în mentenanță." ||
    storedMessage === "Platforma este temporar în mentenanță. Revenim în curând.";
  const maintenanceMessage =
    !storedMessage || legacyDefaultMessage
      ? ro
        ? "Lucrăm la platformă. Accesul va reveni în curând."
        : "We are working on the platform. Access will return shortly."
      : storedMessage;

  async function retryAccess() {
    setChecking(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        await fetch("/api/auth/access", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await statusQuery.refetch();
      const next = searchParams.get("next");
      router.replace(
        isAdmin && next?.startsWith("/") && !next.startsWith("//")
          ? next
          : isAdmin
            ? "/admin"
            : "/"
      );
      router.refresh();
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-xl border-zinc-200 shadow-sm">
        <CardContent className="space-y-6 p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-zinc-950 text-white">
            <LockKeyhole className="size-6" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              ScripticX
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
              Maintenance
            </h1>
            <p className="mx-auto max-w-md text-sm leading-6 text-zinc-600">
              {maintenanceMessage}
            </p>
          </div>

          {isAdmin && !loading && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-zinc-700" />
                <div>
                  <p className="text-sm font-semibold">
                    {ro ? "Cont de administrator" : "Administrator account"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {ro
                      ? "Poți continua configurarea și verificarea platformei."
                      : "You can continue configuring and reviewing the platform."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button onClick={retryAccess} disabled={checking || loading} className="gap-2">
            <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} />
            {isAdmin ? "Admin" : ro ? "Reîncearcă" : "Retry"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LockdownPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <LockdownContent />
    </Suspense>
  );
}
