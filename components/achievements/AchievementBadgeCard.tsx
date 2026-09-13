import {
  Award,
  Brain,
  Check,
  Code2,
  Flame,
  Medal,
  Rocket,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RARITY_STYLES, type RewardRarity } from "@/lib/rewards";

const ICONS: Record<string, LucideIcon> = {
  award: Award,
  brain: Brain,
  check: Check,
  code: Code2,
  flame: Flame,
  medal: Medal,
  rocket: Rocket,
  sparkles: Sparkles,
  star: Star,
  trophy: Trophy,
};

export type AchievementBadgeCardProps = {
  className?: string;
  compact?: boolean;
  description?: string | null;
  iconName?: string | null;
  iconUrl?: string | null;
  rarity?: RewardRarity;
  title: string;
};

export function AchievementIcon({
  className,
  iconName,
  iconUrl,
}: Pick<AchievementBadgeCardProps, "className" | "iconName" | "iconUrl">) {
  const Icon = ICONS[iconName || ""] || Award;

  if (iconUrl) {
    // Custom event icons can come from the managed badge-icons bucket or a URL.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={iconUrl} alt="" className={cn("object-contain", className)} />;
  }

  return <Icon aria-hidden className={className} />;
}

export function AchievementBadgeCard({
  className,
  compact = false,
  description,
  iconName,
  iconUrl,
  rarity = "common",
  title,
}: AchievementBadgeCardProps) {
  const styles = RARITY_STYLES[rarity];

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
        styles.card,
        compact ? "p-3" : "p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl ring-1 ring-black/5",
            compact ? "size-10" : "size-12",
            styles.glow
          )}
        >
          <AchievementIcon
            iconName={iconName}
            iconUrl={iconUrl}
            className={compact ? "size-5" : "size-6"}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{title}</h3>
            <Badge variant="outline" className={cn("h-5 capitalize", styles.badge)}>
              {rarity}
            </Badge>
          </div>
          {description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
