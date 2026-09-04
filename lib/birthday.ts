export const BIRTHDAY_REWARD_IDS = [
  "birthday-party-decoration",
  "birthday-confetti-background",
] as const;

export const BIRTH_DATE_METADATA_KEY =
  "scripticx_registration_birth_date" as const;

export type BirthdaySurpriseResult = {
  claimYear: number | null;
  claimed: boolean;
  productIds: string[];
  status: "already_claimed" | "claimed" | "missing_birth_date" | "not_birthday";
};

export function formatBirthDateForStorage(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseStoredBirthDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

export function isAllowedBirthDate(
  value: string | null | undefined,
  today = new Date()
) {
  const date = parseStoredBirthDate(value);
  if (!date) return false;

  const localToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  return date >= new Date(1900, 0, 1) && date <= localToday;
}

export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Bucharest";
  } catch {
    return "Europe/Bucharest";
  }
}

export function getRegistrationBirthDate(
  metadata: Record<string, unknown> | undefined
) {
  const value = metadata?.[BIRTH_DATE_METADATA_KEY];
  return typeof value === "string" && isAllowedBirthDate(value) ? value : null;
}
