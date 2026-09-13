import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ permissions: [] as string[], queries: [] as { queryKey: unknown[]; enabled?: boolean }[] }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "fixture" }, profile: { username: "fixture" }, isAdmin: false, can: (key: string) => state.permissions.includes(key) }) }));
vi.mock("@/components/LanguageProvider", () => ({ useLanguage: () => ({ locale: "en", t: (key: string) => key }) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: unknown[]; enabled?: boolean }) => { state.queries.push(options); return { data: undefined, isPending: false, isFetching: false, isError: false, refetch: vi.fn() }; },
  useQueryClient: () => ({ getQueryData: vi.fn(), invalidateQueries: vi.fn() }),
}));
vi.mock("@/lib/adminOverviewData", () => ({ fetchAdminCountsForPermissions: vi.fn(), fetchAdminOverviewForPermissions: vi.fn() }));
vi.mock("@/lib/adminAnalyticsData", () => ({ fetchAdminAnalytics: vi.fn() }));
vi.mock("@/lib/onboarding-stats-data", () => ({ fetchOnboardingStats: vi.fn() }));
import { AdminContent } from "./AdminOverviewContent";

beforeEach(() => { state.permissions = []; state.queries = []; vi.stubGlobal("React", React); });
describe("shared admin dashboard", () => {
  it("shows only the shop tool for a designer and disables analytics requests", () => {
    state.permissions = ["admin.shop"];
    const html = renderToStaticMarkup(React.createElement(AdminContent));
    expect(html).toContain('href="/admin/shop"');
    expect(html).not.toContain('href="/admin/users"');
    expect(html).not.toContain('href="/admin/competitions"');
    expect(html).not.toContain("admin.overview.analytics.title");
    expect(html).not.toContain("Onboarding choices");
    for (const key of ["analytics", "onboarding-stats", "overview"]) {
      expect(state.queries.find(query => query.queryKey[1] === key)?.enabled).toBe(false);
    }
  });
  it("shows analytics on the same dashboard without granting unrelated tools", () => {
    state.permissions = ["admin.analytics"];
    const html = renderToStaticMarkup(React.createElement(AdminContent));
    expect(html).toContain("admin.overview.analytics.title");
    expect(html).toContain("Onboarding choices");
    expect(html).not.toContain('href="/admin/shop"');
    expect(html).not.toContain('href="/admin/users"');
    expect(html).not.toContain("/admin/analytics");
    expect(state.queries.find(query => query.queryKey[1] === "analytics")?.enabled).toBe(true);
  });
});
