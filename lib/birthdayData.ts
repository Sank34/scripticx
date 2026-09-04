import {
  getBrowserTimeZone,
  isAllowedBirthDate,
  type BirthdaySurpriseResult,
} from "@/lib/birthday";
import { supabase } from "@/lib/supabase";

export async function savePrivateBirthDate(birthDate: string) {
  if (!isAllowedBirthDate(birthDate)) {
    throw new Error("invalid_birth_date");
  }

  const { error } = await supabase.rpc("set_private_birth_date", {
    p_birth_date: birthDate,
    p_time_zone: getBrowserTimeZone(),
  });

  if (error) throw error;
}

export async function claimBirthdaySurprise(): Promise<BirthdaySurpriseResult> {
  const { data, error } = await supabase.rpc("claim_birthday_surprise");
  if (error) throw error;

  const value = data && typeof data === "object"
    ? data as Record<string, unknown>
    : {};
  const status = value.status;

  return {
    claimYear: typeof value.claimYear === "number" ? value.claimYear : null,
    claimed: value.claimed === true,
    productIds: Array.isArray(value.productIds)
      ? value.productIds.filter((item): item is string => typeof item === "string")
      : [],
    status:
      status === "claimed" ||
      status === "already_claimed" ||
      status === "missing_birth_date"
        ? status
        : "not_birthday",
  };
}
