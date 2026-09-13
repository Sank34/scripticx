export const PERMISSIONS = [
  { key: "admin.classes", en: "Manage all classes", ro: "Administrarea tuturor claselor", path: "/classes" },
  { key: "admin.live", en: "Manage live rooms", ro: "Administrare camere live", path: null },
  { key: "admin.groups", en: "Group administration (platform tools)", ro: "Administrare grupuri (instrumente platformă)", path: null },
  { key: "admin.analytics", en: "Analytics", ro: "Statistici", path: null },
  { key: "admin.tasks", en: "Admin to-do list", ro: "Lista de sarcini admin", path: null },
  { key: "admin.users", en: "Manage users", ro: "Administrare utilizatori", path: "/admin/users" },
  { key: "admin.problems", en: "Problems and chapters", ro: "Probleme și capitole", path: "/admin/problems" },
  { key: "admin.competitions", en: "Competitions", ro: "Competiții", path: "/admin/competitions" },
  { key: "admin.lessons", en: "Lessons", ro: "Lecții", path: "/admin/lessons" },
  { key: "admin.workshops", en: "Workshops", ro: "Workshopuri", path: "/admin/workshops" },
  { key: "admin.shop", en: "Rewards shop", ro: "Magazin de recompense", path: "/admin/shop" },
  { key: "admin.badges", en: "Badges", ro: "Insigne", path: "/admin/badges" },
  { key: "admin.updates", en: "Platform updates", ro: "Noutăți platformă", path: "/admin/updates" },
  { key: "admin.announcements", en: "Announcements", ro: "Anunțuri", path: "/admin/announcements" },
  { key: "admin.contact", en: "Support messages", ro: "Mesaje de contact", path: "/admin/contact" },
  { key: "admin.email", en: "Email campaigns and configuration", ro: "Campanii și configurare email", path: "/admin/email" },
  { key: "admin.design-system", en: "Design system", ro: "Sistem de design", path: "/admin/design-system" },
  { key: "admin.moderation", en: "Reports and moderation", ro: "Raportări și moderare", path: "/feed" },
  { key: "admin.platform", en: "Change maintenance / competition mode", ro: "Modificare maintenance / competition mode", path: "/admin/platform" },
  { key: "admin.daily", en: "Daily challenges", ro: "Provocări zilnice", path: "/admin/problems" },
  { key: "admin.certificates", en: "Certificates", ro: "Certificate", path: null },
  { key: "maintenance.bypass", en: "Use platform during maintenance", ro: "Acces la platformă în maintenance", path: null },
  { key: "competition.bypass", en: "Full platform during competition mode", ro: "Acces complet în competition mode", path: null },
] as const;

export type Permission = typeof PERMISSIONS[number]["key"];
export function isPermission(value: unknown): value is Permission {
  return PERMISSIONS.some(item => item.key === value);
}
export function hasPermission(role: string | null | undefined, permissions: readonly string[], permission: Permission) {
  return role === "admin" || permissions.includes(permission);
}
export function adminPagePermission(pathname: string): Permission | "admin.access" | "admin.roles" | null {
  if (pathname === "/admin") return "admin.access";
  if (pathname === "/admin/roles" || pathname.startsWith("/admin/roles/")) return "admin.roles";
  return PERMISSIONS.find(item => item.path && (pathname === item.path || pathname.startsWith(item.path + "/")))?.key ?? null;
}
export function canAccessAdminPage(pathname: string, can: (permission: Permission) => boolean, isAdmin: boolean, canAccessAdmin: boolean) {
  if (isAdmin) return true;
  if (pathname === "/admin/problems") return can("admin.problems") || can("admin.daily");
  const permission = adminPagePermission(pathname);
  if (permission === "admin.access") return canAccessAdmin;
  return permission !== null && permission !== "admin.roles" && can(permission);
}
export function adminApiPermission(pathname: string): Permission | null {
  if (pathname === "/api/competitions" || pathname.startsWith("/api/competitions/")) return "admin.competitions";
  if (pathname === "/api/admin/onboarding-stats") return "admin.analytics";
  if (pathname.startsWith("/api/admin/companion")) return "admin.moderation";
  if (pathname.startsWith("/api/admin/platform/")) return "admin.platform";
  const moduleName = pathname.split("/")[3];
  const key = `admin.${moduleName}`;
  return isPermission(key) ? key : null;
}
