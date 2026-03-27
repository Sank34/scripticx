"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";

export default function BannedPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("banned")
        .eq("id", user.id)
        .single();

      if (!profile?.banned) {
        router.push("/");
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
    <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-950/20 p-6">

      <Card className="max-w-md w-full border-red-500/30 shadow-xl">
        <CardContent className="flex flex-col items-center text-center space-y-4 p-8">

          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-red-500/10">
            <Ban className="w-7 h-7 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-red-600">
            Account Suspended
          </h1>

          <p className="text-sm text-muted-foreground">
            Your account has been banned from using the platform.
          </p>

          <p className="text-xs text-muted-foreground">
            If you believe this is a mistake, please contact support.
          </p>

          <Button
            onClick={logout}
            className="mt-2 bg-red-500 hover:bg-red-600"
          >
            Logout
          </Button>

        </CardContent>
      </Card>

    </div>
  );
}