import type { OnboardingStats } from "@/lib/onboarding-stats";
import { supabase } from "@/lib/supabase";

export async function fetchOnboardingStats(): Promise<OnboardingStats> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Authentication required");

  const response = await fetch("/api/admin/onboarding-stats", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Could not load onboarding statistics");
  return response.json() as Promise<OnboardingStats>;
}
