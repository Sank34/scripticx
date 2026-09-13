import { PERMISSIONS, type Permission } from "@/lib/permissions";
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

export function fetchAdminCounts(): Promise<AdminCounts> {
  return fetchAdminCountsForPermissions(PERMISSIONS.map(permission => permission.key));
}

export async function fetchAdminCountsForPermissions(permissions: readonly Permission[]): Promise<AdminCounts> {
  const count = (permission: Permission, table: string, apply?: (query: CountQuery) => CountQuery) =>
    permissions.includes(permission) ? countRows(table, apply) : Promise.resolve(null);
  const [problems, users, bannedUsers, updates, contactTotal, contactNew, achievements, rewardProducts] =
    await Promise.all([
      count("admin.problems", "problems"),
      count("admin.users", "profiles"),
      count("admin.users", "profiles", (query) => query.eq("banned", true)),
      count("admin.updates", "updates"),
      count("admin.contact", "contact_messages"),
      count("admin.contact", "contact_messages", (query) => query.eq("status", "new")),
      count("admin.badges", "achievements"),
      count("admin.shop", "reward_products"),
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

export function fetchAdminOverview(): Promise<AdminOverviewRaw> {
  return fetchAdminOverviewForPermissions(PERMISSIONS.map(permission => permission.key));
}

export async function fetchAdminOverviewForPermissions(permissions: readonly Permission[]): Promise<AdminOverviewRaw> {
  const [openMessages, bannedUsers, latestUpdates, todaysChallenge, upcoming] =
    await Promise.allSettled([
      permissions.includes("admin.contact") ? fetchOpenMessages() : Promise.resolve([]),
      permissions.includes("admin.users") ? fetchBannedUsers() : Promise.resolve([]),
      permissions.includes("admin.updates") ? fetchUpdates() : Promise.resolve([]),
      permissions.includes("admin.daily") ? api.dailyChallenges.getForDate() : Promise.resolve(null),
      permissions.includes("admin.daily") ? api.dailyChallenges.list(14) : Promise.resolve([]),
    ]);

  return {
    bannedUsers: settled(bannedUsers, []),
    latestUpdates: settled(latestUpdates, []).slice(0, 3),
    openMessages: settled(openMessages, []),
    todaysChallenge: settled(todaysChallenge, null),
    upcomingChallenges: settled(upcoming, []),
  };
}
