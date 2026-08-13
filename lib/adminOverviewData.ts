import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { fetchUpdates } from "@/lib/updates";

import type {
  AdminCounts,
  AdminOverviewRaw,
  ContactMessageLite,
  CountResult,
  ProfileLite,
} from "@/lib/adminOverview";

type CountQuery = ReturnType<ReturnType<typeof supabase.from>["select"]>;

async function countRows(
  table: string,
  apply?: (query: CountQuery) => CountQuery
): Promise<CountResult> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (apply)
    query = apply(query);

  const { count, error } = await query;

  if (error) {
    console.warn(`Admin count failed for "${table}".`, error);
    return null;
  }

  return count ?? 0;
}

export async function fetchAdminCounts(): Promise<AdminCounts> {
  const [problems, users, bannedUsers, updates, contactTotal, contactNew, achievements, rewardProducts] =
    await Promise.all([
      countRows("problems"),
      countRows("profiles"),
      countRows("profiles", (query) => query.eq("banned", true)),
      countRows("updates"),
      countRows("contact_messages"),
      countRows("contact_messages", (query) => query.eq("status", "new")),
      countRows("achievements"),
      countRows("reward_products"),
    ]);

  return {
    achievements,
    bannedUsers,
    contactNew,
    contactTotal,
    problems,
    rewardProducts,
    updates,
    users,
  };
}

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  if (result.status === "fulfilled") return result.value;

  console.warn("Admin overview sub-request failed.", result.reason);
  return fallback;
}

async function fetchOpenMessages(): Promise<ContactMessageLite[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("id, name, email, topic, status, description, created_at")
    .in("status", ["new", "read"])
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) throw error;

  return (data ?? []) as ContactMessageLite[];
}

async function fetchBannedUsers(): Promise<ProfileLite[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, banned")
    .eq("banned", true)
    .order("username")
    .limit(5);

  if (error) throw error;

  return (data ?? []) as ProfileLite[];
}

export async function fetchAdminOverview(): Promise<AdminOverviewRaw> {
  const [openMessages, bannedUsers, latestUpdates, todaysChallenge, upcoming] =
    await Promise.allSettled([
      fetchOpenMessages(),
      fetchBannedUsers(),
      fetchUpdates(),
      api.dailyChallenges.getForDate(),
      api.dailyChallenges.list(14),
    ]);

  return {
    bannedUsers: settled(bannedUsers, []),
    latestUpdates: settled(latestUpdates, []).slice(0, 3),
    openMessages: settled(openMessages, []),
    todaysChallenge: settled(todaysChallenge, null),
    upcomingChallenges: settled(upcoming, []),
  };
}
