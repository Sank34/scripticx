import { describe, expect, it } from "vitest";
import { canAccessAdminPage, type Permission } from "./permissions";

describe("shared problem administration page", () => {
  const access = (permissions: Permission[], path: string) =>
    canAccessAdminPage(path, (permission) => permissions.includes(permission), false, permissions.length > 0);

  it("lets daily managers reach scheduling but not problem or chapter editors", () => {
    expect(access(["admin.daily"], "/admin/problems")).toBe(true);
    expect(access(["admin.daily"], "/admin/problems/chapters")).toBe(false);
    expect(access(["admin.daily"], "/admin/problems/problem-id")).toBe(false);
    expect(access(["admin.daily"], "/admin/daily")).toBe(false);
  });

  it("preserves problem editing access and rejects unrelated roles", () => {
    expect(access(["admin.problems"], "/admin/problems")).toBe(true);
    expect(access(["admin.problems"], "/admin/problems/chapters")).toBe(true);
    expect(access(["admin.problems"], "/admin/problems/problem-id")).toBe(true);
    expect(access(["admin.shop"], "/admin/problems")).toBe(false);
  });
});
