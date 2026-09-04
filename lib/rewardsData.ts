import { supabase } from "@/lib/supabase";
import type {
  BadgeAutomaticRule,
  BadgeDefinition,
  EquippedRewards,
  RewardInventoryItem,
  RewardProduct,
} from "@/lib/rewards";

type BadgeRow = {
  active: boolean | null;
  automatic_rule?: BadgeAutomaticRule | null;
  created_at?: string | null;
  description?: string | null;
  event_name?: string | null;
  icon?: string | null;
  icon_url?: string | null;
  id: string;
  key: string;
  rarity?: BadgeDefinition["rarity"] | null;
  title: string;
  trigger_type?: BadgeDefinition["trigger"] | null;
  updated_at?: string | null;
};

type RewardProductRow = {
  active?: boolean | null;
  asset_url?: string | null;
  category: string;
  created_at?: string | null;
  description_i18n: RewardProduct["description"];
  id: string;
  name_i18n: RewardProduct["name"];
  price: number;
  rarity: RewardProduct["rarity"];
  sort_order?: number | null;
  style_config?: RewardProduct["styleConfig"] | null;
  visual: string;
};

export type BadgeRecipient = {
  avatarUrl: string | null;
  equippedRewards: EquippedRewards;
  hasBadge: boolean;
  id: string;
  username: string;
};

export type RewardsShopData = {
  balance: number;
  equipped: EquippedRewards;
  inventory: RewardInventoryItem[];
  products: RewardProduct[];
};

export type DeleteRewardProductResult = {
  archived: boolean;
  deleted: boolean;
};

function normalizeProduct(row: RewardProductRow): RewardProduct {
  const isLegacyAurora = row.id === "aurora-profile";

  return {
    id: row.id,
    assetUrl: row.asset_url || undefined,
    category: isLegacyAurora
      ? "profile-background"
      : row.category as RewardProduct["category"],
    name: isLegacyAurora
      ? { en: "Leaf canopy", ro: "Frunziș" }
      : row.name_i18n,
    description: isLegacyAurora
      ? {
          en: "A quiet leaf pattern behind your profile, separate from your banner.",
          ro: "Un pattern discret cu frunze în spatele profilului, separat de banner.",
        }
      : row.description_i18n,
    price: Number(row.price) || 0,
    rarity: row.rarity,
    visual: isLegacyAurora
      ? "leaf-canopy"
      : row.visual as RewardProduct["visual"],
    active: row.active ?? true,
    sort_order: row.sort_order ?? 0,
    styleConfig: row.style_config || undefined,
    created_at: row.created_at || undefined,
  };
}

function normalizeBadge(row: BadgeRow, recipients = 0): BadgeDefinition {
  const legacyRules: Record<string, BadgeAutomaticRule> = {
    first_solve: { metric: "problems_solved", threshold: 1 },
    five_solves: { metric: "problems_solved", threshold: 5 },
    ten_solves: { metric: "problems_solved", threshold: 10 },
    perfect: { metric: "perfect_submissions", threshold: 1 },
  };

  return {
    id: String(row.id),
    key: row.key,
    title: row.title,
    description: row.description || "",
    iconName: row.icon || "award",
    iconUrl: row.icon_url || undefined,
    rarity: row.rarity || "common",
    trigger: row.trigger_type || "manual",
    automaticRule: row.automatic_rule || legacyRules[row.key],
    eventName: row.event_name || undefined,
    active: row.active ?? true,
    recipients,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

export async function fetchAdminBadges(): Promise<BadgeDefinition[]> {
  const [{ data: badgeRows, error: badgesError }, { data: awards, error: awardsError }] =
    await Promise.all([
      supabase.from("achievements").select("*").order("created_at", { ascending: false }),
      supabase.from("user_achievements").select("achievement_id"),
    ]);

  if (badgesError) throw badgesError;
  if (awardsError) throw awardsError;

  const counts = new Map<string, number>();
  for (const award of awards || []) {
    const id = String(award.achievement_id);
    counts.set(id, (counts.get(id) || 0) + 1);
  }

  return ((badgeRows || []) as BadgeRow[]).map((row) =>
    normalizeBadge(row, counts.get(String(row.id)) || 0)
  );
}

export async function saveAdminBadge(badge: BadgeDefinition): Promise<BadgeDefinition> {
  const payload = {
    key: badge.key,
    title: badge.title,
    description: badge.description,
    icon: badge.iconName,
    icon_url: badge.iconUrl || null,
    rarity: badge.rarity,
    trigger_type: badge.trigger,
    automatic_rule: badge.trigger === "automatic" ? badge.automaticRule || null : null,
    event_name: badge.trigger === "event" ? badge.eventName || null : null,
    active: badge.active,
  };

  const query = badge.id
    ? supabase.from("achievements").update(payload).eq("id", badge.id)
    : supabase.from("achievements").insert(payload);
  const { data, error } = await query.select("*").single();

  if (error) throw error;
  return normalizeBadge(data as BadgeRow, badge.recipients || 0);
}

export async function deleteAdminBadge(badgeId: string) {
  const { error } = await supabase.rpc("admin_delete_achievement", {
    p_badge_id: badgeId,
  });
  if (error) throw error;
}

export async function uploadBadgeIcon(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("unsupported_badge_icon");
  }
  if (file.size > 1024 * 1024) throw new Error("badge_icon_too_large");

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("badge-icons").upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;
  return supabase.storage.from("badge-icons").getPublicUrl(path).data.publicUrl;
}

export async function fetchBadgeRecipients(badgeId: string): Promise<BadgeRecipient[]> {
  const [{ data: profiles, error: profilesError }, { data: awards, error: awardsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, avatar_url, equipped_rewards")
        .not("username", "is", null)
        .order("username", { ascending: true })
        .limit(1000),
      supabase
        .from("user_achievements")
        .select("user_id")
        .eq("achievement_id", badgeId),
    ]);

  if (profilesError) throw profilesError;
  if (awardsError) throw awardsError;

  const awardedIds = new Set((awards || []).map((row) => String(row.user_id)));
  return (profiles || []).map((profile) => ({
    id: String(profile.id),
    username: String(profile.username),
    avatarUrl: profile.avatar_url || null,
    equippedRewards: (profile.equipped_rewards || {}) as EquippedRewards,
    hasBadge: awardedIds.has(String(profile.id)),
  }));
}

export async function setBadgeAwarded(
  badgeId: string,
  userId: string,
  awarded: boolean
) {
  const query = awarded
    ? supabase.from("user_achievements").insert({
        user_id: userId,
        achievement_id: badgeId,
      })
    : supabase
        .from("user_achievements")
        .delete()
        .eq("user_id", userId)
        .eq("achievement_id", badgeId);
  const { error } = await query;
  if (error) throw error;
}

export async function fetchAdminRewardProducts(): Promise<RewardProduct[]> {
  const [{ data: rows, error }, { data: inventory, error: inventoryError }] =
    await Promise.all([
      supabase
        .from("reward_products")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("user_reward_inventory").select("product_id"),
    ]);

  if (error) throw error;
  if (inventoryError) throw inventoryError;

  const owners = new Map<string, number>();
  for (const entry of inventory || []) {
    const id = String(entry.product_id);
    owners.set(id, (owners.get(id) || 0) + 1);
  }

  return ((rows || []) as RewardProductRow[]).map((row) => ({
    ...normalizeProduct(row),
    owners: owners.get(row.id) || 0,
  }));
}

export async function saveAdminRewardProduct(
  product: RewardProduct,
  isNew: boolean
): Promise<RewardProduct> {
  const payload = {
    id: product.id,
    category: product.category,
    name_i18n: product.name,
    description_i18n: product.description,
    asset_url: product.assetUrl || null,
    style_config: product.styleConfig || {},
    price: product.price,
    rarity: product.rarity,
    visual: product.visual,
    active: product.active ?? true,
    sort_order: product.sort_order || 0,
  };

  const query = isNew
    ? supabase.from("reward_products").insert(payload)
    : supabase
        .from("reward_products")
        .update(payload)
        .eq("id", product.id);
  const { data, error } = await query.select("*").single();

  if (error) throw error;
  return normalizeProduct(data as RewardProductRow);
}

export async function deleteAdminRewardProduct(
  productId: string
): Promise<DeleteRewardProductResult> {
  const { data, error } = await supabase.rpc("admin_delete_reward_product", {
    p_product_id: productId,
  });
  if (error) throw error;
  return data as DeleteRewardProductResult;
}

const REWARD_ASSET_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function validateRewardAsset(file: File) {
  if (!REWARD_ASSET_TYPES.has(file.type)) {
    throw new Error("unsupported_reward_asset");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("reward_asset_too_large");
  }
}

export async function uploadRewardAsset(
  file: File,
  purpose: "background" | "overlay" | "pattern"
): Promise<string> {
  validateRewardAsset(file);

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${purpose}/${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("reward-assets").upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;
  return supabase.storage.from("reward-assets").getPublicUrl(path).data.publicUrl;
}

export async function fetchRewardsShop(userId: string): Promise<RewardsShopData> {
  const [productsResult, inventoryResult, profileResult] = await Promise.all([
    supabase
      .from("reward_products")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("user_reward_inventory")
      .select("product_id, acquired_at, equipped_at, product:reward_products(*)")
      .eq("user_id", userId)
      .order("acquired_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("reward_points, equipped_rewards")
      .eq("id", userId)
      .single(),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (inventoryResult.error) throw inventoryResult.error;
  if (profileResult.error) throw profileResult.error;

  const products = ((productsResult.data || []) as RewardProductRow[]).map(normalizeProduct);
  const inventory = (inventoryResult.data || []).flatMap((row) => {
    const relation = Array.isArray(row.product) ? row.product[0] : row.product;
    if (!relation) return [];
    return [{
      acquiredAt: row.acquired_at,
      equipped: Boolean(row.equipped_at),
      product: normalizeProduct(relation as RewardProductRow),
    }];
  });

  return {
    balance: Number(profileResult.data.reward_points) || 0,
    equipped: (profileResult.data.equipped_rewards || {}) as EquippedRewards,
    inventory,
    products,
  };
}

export async function fetchRewardProductsByIds(
  productIds: string[]
): Promise<RewardProduct[]> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const { data, error } = await supabase
    .from("reward_products")
    .select("*")
    .in("id", uniqueIds);

  if (error) throw error;

  const order = new Map(uniqueIds.map((id, index) => [id, index]));
  return ((data || []) as RewardProductRow[])
    .map(normalizeProduct)
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function purchaseReward(productId: string) {
  const { data, error } = await supabase.rpc("purchase_reward", {
    p_product_id: productId,
  });
  if (error) throw error;
  return data as { balance: number; product_id: string };
}

export async function equipReward(productId: string): Promise<EquippedRewards> {
  const { data, error } = await supabase.rpc("equip_reward", {
    p_product_id: productId,
  });
  if (error) throw error;
  return (data || {}) as EquippedRewards;
}

export async function unequipReward(productId: string): Promise<EquippedRewards> {
  const { data, error } = await supabase.rpc("unequip_reward", {
    p_product_id: productId,
  });
  if (error) throw error;
  return (data || {}) as EquippedRewards;
}

export function getRewardsErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return "unknown";
  const message = "message" in error ? String(error.message) : "";
  return [
    "insufficient_reward_points",
    "reward_already_owned",
    "reward_not_owned",
    "reward_not_equipped",
    "reward_not_found",
    "authentication_required",
  ].find((code) => message.includes(code)) || "unknown";
}
