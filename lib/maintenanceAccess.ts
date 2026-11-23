type MaintenanceAccess = {
  lockdownEnabled?: boolean;
  lockdownMode?: string | null;
  maintenanceBypass?: boolean;
  role?: string;
};

const maintenancePublicPages = new Set([
  "/login",
  "/auth/callback",
  "/auth-account-callback.html",
  "/forgot-password",
  "/reset-password",
  "/banned",
  "/lockdown",
]);

export function getMaintenanceRedirect(
  pathname: string,
  status: MaintenanceAccess | null
): string | null {
  if (
    !status?.lockdownEnabled ||
    status.lockdownMode === "competition" ||
    status.maintenanceBypass ||
    status.role === "admin" ||
    maintenancePublicPages.has(pathname)
  ) {
    return null;
  }

  return `/lockdown?next=${encodeURIComponent(pathname)}`;
}
