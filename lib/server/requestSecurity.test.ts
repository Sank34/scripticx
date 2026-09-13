import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ role: "user", banned: false, valid: true, enabled: false, mode: null as string | null, participant: false, permissions: [] as string[], permissionError: false }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseServer", () => ({
  createServerSupabase: () => ({ auth: { getUser: async () => ({ data: { user: state.valid ? { id: "test-user" } : null }, error: null }) } }),
  createAdminSupabase: () => ({
    rpc: async () => ({ data: state.permissions, error: state.permissionError ? new Error("Unavailable") : null }),
    from: (table: string) => {
      const query = {
        select: () => query, eq: () => query, limit: () => query,
        maybeSingle: async () => ({ error: null, data: table === "profiles" ? { role: state.role, banned: state.banned } : table === "platform_settings" ? { lockdown_enabled: state.enabled, lockdown_mode: state.mode } : state.participant ? { user_id: "test-user" } : null }),
      };
      return query;
    },
  }),
}));
import { requireAdmin, requireUser } from "@/lib/server/requestSecurity";

const request = (path = "/api/admin/announcements") => new Request(`https://scripticx.test${path}`, { headers: { Authorization: "Bearer test-token" } });
beforeEach(() => Object.assign(state, { role: "user", banned: false, valid: true, enabled: false, mode: null, participant: false, permissions: [], permissionError: false }));

describe("permission authorization", () => {
  it("requires a valid session", async () => {
    await expect(requireAdmin(new Request("https://scripticx.test/api/admin/announcements"))).rejects.toMatchObject({ status: 401 });
    state.valid = false;
    await expect(requireAdmin(request())).rejects.toMatchObject({ status: 401 });
  });
  it("grants only the selected module and preserves the ordinary role", async () => {
    state.permissions = ["admin.announcements"];
    expect((await requireAdmin(request())).role).toBe("user");
    await expect(requireAdmin(request("/api/admin/email/send"))).rejects.toMatchObject({ status: 403 });
  });
  it("never delegates role management or unknown administrative routes", async () => {
    state.permissions = ["admin.users", "admin.shop", "maintenance.bypass"];
    await expect(requireAdmin(request("/api/admin/roles"))).rejects.toMatchObject({ status: 403 });
    await expect(requireAdmin(request("/api/admin/future-feature"))).rejects.toMatchObject({ status: 403 });
  });
  it("retains full-admin access but refuses banned administrators", async () => {
    state.role = "admin";
    await expect(requireAdmin(request())).resolves.toMatchObject({ role: "admin" });
    state.banned = true;
    await expect(requireAdmin(request())).rejects.toMatchObject({ status: 403 });
  });
  it("separates maintenance bypass from module permissions", async () => {
    state.enabled = true; state.mode = "maintenance"; state.permissions = ["admin.announcements"];
    await expect(requireAdmin(request())).rejects.toMatchObject({ status: 423 });
    state.permissions.push("maintenance.bypass");
    await expect(requireAdmin(request())).resolves.toMatchObject({ role: "user" });
    state.permissions = ["maintenance.bypass"];
    await expect(requireAdmin(request())).rejects.toMatchObject({ status: 403 });
  });
  it("ignores a stale mode when maintenance is switched off", async () => {
    state.mode = "maintenance";
    await expect(requireUser(request())).resolves.toMatchObject({ role: "user" });
  });
  it("limits active competition participants unless explicitly exempted", async () => {
    state.enabled = true; state.mode = "competition";
    await expect(requireUser(request())).resolves.toMatchObject({ role: "user" });
    state.participant = true;
    await expect(requireUser(request())).rejects.toMatchObject({ status: 423 });
    await expect(requireUser(request("/api/competitions"))).resolves.toMatchObject({ role: "user" });
    state.permissions = ["competition.bypass"];
    await expect(requireUser(request())).resolves.toMatchObject({ role: "user" });
  });
  it("revokes permissions on the next request", async () => {
    state.permissions = ["admin.announcements"];
    await requireAdmin(request());
    state.permissions = [];
    await expect(requireAdmin(request())).rejects.toMatchObject({ status: 403 });
  });
  it("fails closed when permission lookup is unavailable", async () => {
    state.permissions = ["admin.announcements"]; state.permissionError = true;
    await expect(requireAdmin(request())).rejects.toThrow("Could not verify platform permissions");
  });
});
