export const announcementItemLimit = 3;

export type AnnouncementImage = { src: string; alt: string };
export type AnnouncementButton = { label: string; href: string };

export type ScheduledAnnouncement = {
  id: string;
  title: string;
  body: string;
  show_mascots: boolean;
  images: AnnouncementImage[];
  buttons: AnnouncementButton[];
  starts_at: string;
  ends_at: string;
  disabled_at: string | null;
};

export function isAnnouncementUrl(value: string, allowInternal = false) {
  if (!value || /[\\\p{Cc}]/u.test(value)) return false;
  if (allowInternal && value.startsWith("/") && !value.startsWith("//")) return true;

  if (!/^https:\/\//i.test(value)) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
