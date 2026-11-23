import { describe, expect, it } from "vitest";

import { getMaintenanceRedirect } from "@/lib/maintenanceAccess";

describe("maintenance access", () => {
  const maintenance = { lockdownEnabled: true, lockdownMode: "maintenance" };

  it("lets signed-out users sign in and complete OAuth during maintenance", () => {
    expect(getMaintenanceRedirect("/login", maintenance)).toBeNull();
    expect(getMaintenanceRedirect("/auth/callback", maintenance)).toBeNull();
    expect(getMaintenanceRedirect("/auth-account-callback.html", maintenance)).toBeNull();
  });

  it("keeps password recovery reachable without opening product pages", () => {
    expect(getMaintenanceRedirect("/forgot-password", maintenance)).toBeNull();
    expect(getMaintenanceRedirect("/reset-password", maintenance)).toBeNull();
    expect(getMaintenanceRedirect("/dashboard", maintenance)).toBe(
      "/lockdown?next=%2Fdashboard"
    );
  });

  it("keeps regular signed-in users out and preserves their destination", () => {
    expect(
      getMaintenanceRedirect("/roadmap/first lesson", {
        ...maintenance,
        role: "user",
      })
    ).toBe("/lockdown?next=%2Froadmap%2Ffirst%20lesson");
  });

  it("does not grant access to routes that only resemble authentication routes", () => {
    expect(getMaintenanceRedirect("/login/settings", maintenance)).toBeTruthy();
    expect(getMaintenanceRedirect("/auth/callback/admin", maintenance)).toBeTruthy();
  });

  it("lets administrators and users with verified bypass permission continue", () => {
    expect(
      getMaintenanceRedirect("/admin", { ...maintenance, role: "admin" })
    ).toBeNull();
    expect(
      getMaintenanceRedirect("/dashboard", {
        ...maintenance,
        role: "teacher",
        maintenanceBypass: true,
      })
    ).toBeNull();
  });

  it("leaves normal mode and competition routing to their existing handlers", () => {
    expect(getMaintenanceRedirect("/dashboard", null)).toBeNull();
    expect(
      getMaintenanceRedirect("/dashboard", { lockdownEnabled: false })
    ).toBeNull();
    expect(
      getMaintenanceRedirect("/dashboard", {
        lockdownEnabled: true,
        lockdownMode: "competition",
      })
    ).toBeNull();
    expect(getMaintenanceRedirect("/lockdown", maintenance)).toBeNull();
  });
});
