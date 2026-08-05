export type LocalizedText = {
  en: string;
  ro: string;
};

export type RewardCategory =
  | "avatar-frame"
  | "avatar-decoration"
  | "profile-background"
  | "profile-title";

export type RewardBackgroundMode = "image" | "pattern";

export type RewardStyleConfig = {
  assetOffsetX?: number;
  assetOffsetY?: number;
  assetScale?: number;
  backgroundColor?: string;
  backgroundMode?: RewardBackgroundMode;
  imageOpacity?: number;
  patternOpacity?: number;
  patternSize?: number;
  patternUrl?: string;
};

export type RewardVisual =
  | "orbit"
  | "laurel"
  | "pixel-crown"
  | "leaf-canopy"
  | "title"
  | "custom-overlay"
  | "custom-background";

export type EquippedRewardSnapshot = {
  assetUrl?: string;
  id: string;
  name?: LocalizedText;
  styleConfig?: RewardStyleConfig;
  visual?: RewardVisual;
};

export type EquippedRewardValue = string | EquippedRewardSnapshot;

export type EquippedRewards = Partial<
  Record<RewardCategory, EquippedRewardValue>
> & {
  /** Temporary compatibility key for inventories created before profile backgrounds. */
  "profile-banner"?: EquippedRewardValue;
};

export function getEquippedRewardId(value?: EquippedRewardValue | null) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function hasLeafCanopyBackground(
  equippedRewards?: EquippedRewards | null
) {
  if (!equippedRewards) return false;

  const backgroundId = getEquippedRewardId(
    equippedRewards["profile-background"]
  );
  const legacyBackgroundId = getEquippedRewardId(
    equippedRewards["profile-banner"]
  );

  return (
    backgroundId === "leaf-canopy-background" ||
    legacyBackgroundId === "aurora-profile"
  );
}

export type RewardRarity = "common" | "rare" | "epic" | "legendary";

export type RewardProduct = {
  active?: boolean;
  assetUrl?: string;
  category: RewardCategory;
  created_at?: string;
  description: LocalizedText;
  id: string;
  name: LocalizedText;
  owners?: number;
  price: number;
  rarity: RewardRarity;
  sort_order?: number;
  styleConfig?: RewardStyleConfig;
  visual: RewardVisual;
};

export const SHOP_CATALOG: RewardProduct[] = [
  {
    id: "orbit-frame",
    category: "avatar-frame",
    name: { en: "Orbit frame", ro: "Ramă Orbit" },
    description: {
      en: "A bright animated ring for your avatar.",
      ro: "Un inel luminos animat pentru avatarul tău.",
    },
    price: 450,
    rarity: "rare",
    visual: "orbit",
  },
  {
    id: "laurel-decoration",
    category: "avatar-decoration",
    name: { en: "Code laurels", ro: "Laurii de cod" },
    description: {
      en: "A leafy decoration for focused problem solvers.",
      ro: "O decorație pentru cei care rezolvă probleme cu răbdare.",
    },
    price: 700,
    rarity: "epic",
    visual: "laurel",
  },
  {
    id: "pixel-crown",
    category: "avatar-decoration",
    name: { en: "Pixel crown", ro: "Coroană pixelată" },
    description: {
      en: "A limited crown inspired by classic games.",
      ro: "O coroană limitată inspirată din jocurile clasice.",
    },
    price: 1_200,
    rarity: "legendary",
    visual: "pixel-crown",
  },
  {
    id: "leaf-canopy-background",
    category: "profile-background",
    name: { en: "Leaf canopy", ro: "Frunziș" },
    description: {
      en: "A quiet leaf pattern behind your profile, separate from your banner.",
      ro: "Un pattern discret cu frunze în spatele profilului, separat de banner.",
    },
    price: 850,
    rarity: "epic",
    visual: "leaf-canopy",
  },
  {
    id: "bug-tamer-title",
    category: "profile-title",
    name: { en: "Bug tamer", ro: "Îmblânzitor de bug-uri" },
    description: {
      en: "A playful title displayed next to your username.",
      ro: "Un titlu jucăuș afișat lângă numele tău.",
    },
    price: 300,
    rarity: "common",
    visual: "title",
  },
];

export function rewardProductToSnapshot(
  product: RewardProduct
): EquippedRewardSnapshot {
  return {
    id: product.id,
    visual: product.visual,
    assetUrl: product.assetUrl,
    styleConfig: product.styleConfig,
    name: product.name,
  };
}

export function resolveEquippedReward(
  value?: EquippedRewardValue | null
): EquippedRewardSnapshot | null {
  if (!value) return null;
  if (typeof value !== "string") return value;

  const legacyId = value === "aurora-profile"
    ? "leaf-canopy-background"
    : value;
  const product = SHOP_CATALOG.find((entry) => entry.id === legacyId);

  return product
    ? { ...rewardProductToSnapshot(product), id: value }
    : { id: value };
}

export type BadgeTrigger = "automatic" | "event" | "manual";

export type BadgeRuleMetric =
  | "problems_solved"
  | "perfect_submissions"
  | "submissions_sent"
  | "total_score"
  | "daily_challenges"
  | "competition_participations"
  | "competition_problems_solved";

export type BadgeAutomaticRule = {
  metric: BadgeRuleMetric;
  threshold: number;
};

export type BadgeDefinition = {
  active: boolean;
  automaticRule?: BadgeAutomaticRule;
  createdAt?: string;
  description: string;
  eventName?: string;
  iconName: string;
  iconUrl?: string;
  id: string;
  key: string;
  rarity: RewardRarity;
  recipients: number;
  title: string;
  trigger: BadgeTrigger;
  updatedAt?: string;
};

export type RewardInventoryItem = {
  acquiredAt: string;
  equipped: boolean;
  product: RewardProduct;
};

export const DEFAULT_BADGES: BadgeDefinition[] = [
  {
    id: "first-solve",
    key: "first_solve",
    title: "Prima rezolvare",
    description: "A rezolvat prima problemă cu punctaj maxim.",
    iconName: "rocket",
    rarity: "common",
    trigger: "automatic",
    automaticRule: { metric: "problems_solved", threshold: 1 },
    active: true,
    recipients: 128,
  },
  {
    id: "five-solves",
    key: "five_solves",
    title: "În plin avânt",
    description: "A rezolvat cinci probleme cu punctaj maxim.",
    iconName: "flame",
    rarity: "rare",
    trigger: "automatic",
    automaticRule: { metric: "problems_solved", threshold: 5 },
    active: true,
    recipients: 74,
  },
  {
    id: "ten-solves",
    key: "ten_solves",
    title: "Problem solver",
    description: "A rezolvat zece probleme cu punctaj maxim.",
    iconName: "brain",
    rarity: "epic",
    trigger: "automatic",
    automaticRule: { metric: "problems_solved", threshold: 10 },
    active: true,
    recipients: 31,
  },
  {
    id: "perfect-score",
    key: "perfect",
    title: "Scor perfect",
    description: "A obținut 100 de puncte la o problemă.",
    iconName: "trophy",
    rarity: "rare",
    trigger: "automatic",
    automaticRule: { metric: "perfect_submissions", threshold: 1 },
    active: true,
    recipients: 96,
  },
  {
    id: "summer-code-2026",
    key: "event_summer_code_2026",
    title: "Summer Code 2026",
    description: "A participat la evenimentul Summer Code 2026.",
    eventName: "Summer Code 2026",
    iconName: "sparkles",
    rarity: "legendary",
    trigger: "event",
    active: true,
    recipients: 42,
  },
];

export const BADGE_ICON_NAMES = [
  "award",
  "brain",
  "check",
  "code",
  "flame",
  "medal",
  "rocket",
  "sparkles",
  "star",
  "trophy",
] as const;

export const RARITY_STYLES: Record<
  RewardRarity,
  { badge: string; card: string; glow: string }
> = {
  common: {
    badge: "border-zinc-200 bg-zinc-100 text-zinc-700",
    card: "border-zinc-200 bg-white",
    glow: "bg-zinc-500/10 text-zinc-700",
  },
  rare: {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    card: "border-sky-200 bg-white",
    glow: "bg-sky-500/10 text-sky-600",
  },
  epic: {
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    card: "border-violet-200 bg-white",
    glow: "bg-violet-500/10 text-violet-600",
  },
  legendary: {
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    card: "border-amber-200 bg-white",
    glow: "bg-amber-500/10 text-amber-600",
  },
};

export function getLegacyBadgeRarity(iconName?: string | null): RewardRarity {
  if (iconName === "brain") return "epic";
  if (iconName === "trophy" || iconName === "flame") return "rare";
  return "common";
}
