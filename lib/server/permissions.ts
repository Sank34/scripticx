import "server-only";
import { createAdminSupabase } from "@/lib/supabaseServer";
import { isPermission, type Permission } from "@/lib/permissions";

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const { data, error } = await createAdminSupabase().rpc("platform_user_permissions", { p_user_id: userId });
  if (error) throw new Error("Could not verify platform permissions");
  return Array.isArray(data) ? data.filter(isPermission) : [];
}
