"use client";

import { useId } from "react";
import { Leaf } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  resolveEquippedReward,
  rewardProductToSnapshot,
  type EquippedRewardValue,
  type RewardProduct,
} from "@/lib/rewards";

export function ProfileBackground({
  className,
  product,
  preview = false,
  reward,
}: {
  className?: string;
  product?: RewardProduct;
  preview?: boolean;
  reward?: EquippedRewardValue | null;
}) {
  const generatedId = useId();
  const leafPatternId = `leaf-decoration-pattern-${generatedId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const resolved = product
    ? rewardProductToSnapshot(product)
    : resolveEquippedReward(reward);

  if (!resolved) return null;

  const isLeafCanopy =
    resolved.id === "leaf-canopy-background" ||
    resolved.id === "aurora-profile" ||
    resolved.visual === "leaf-canopy";
  const style = resolved.styleConfig || {};
  const backgroundColor = style.backgroundColor ||
    (isLeafCanopy ? "#f6f8f4" : "#f7f7f6");
  const opacity = Math.min(1, Math.max(0.02, style.patternOpacity ?? 0.08));
  const imageOpacity = Math.min(1, Math.max(0.08, style.imageOpacity ?? 1));
  const patternSize = Math.min(320, Math.max(32, style.patternSize ?? 96));
  const leafSize = patternSize * 0.4;
  const leafTileHeight = patternSize * 0.78;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden text-emerald-950",
        preview && "h-full",
        className
      )}
      style={{ backgroundColor }}
    >
      {isLeafCanopy && (
        <svg
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id={leafPatternId}
              width={patternSize}
              height={leafTileHeight}
              patternUnits="userSpaceOnUse"
            >
              <g opacity={opacity}>
                <Leaf
                  x={patternSize * 0.08}
                  y={leafTileHeight * 0.2}
                  width={leafSize}
                  height={leafSize}
                  fill="#d1fae5"
                  stroke="#059669"
                  strokeWidth={1.75}
                  transform={`rotate(-35 ${patternSize * 0.28} ${leafTileHeight * 0.46})`}
                />
                <Leaf
                  x={patternSize * 0.5}
                  y={leafTileHeight * 0.2}
                  width={leafSize}
                  height={leafSize}
                  fill="#d1fae5"
                  stroke="#059669"
                  strokeWidth={1.75}
                  transform={`rotate(215 ${patternSize * 0.7} ${leafTileHeight * 0.46})`}
                />
              </g>
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill={`url(#${leafPatternId})`} />
        </svg>
      )}

      {!isLeafCanopy && style.backgroundMode === "pattern" && style.patternUrl && (
        <div
          className="absolute inset-0 bg-repeat"
          style={{
            backgroundImage: `url("${style.patternUrl}")`,
            backgroundSize: `${patternSize}px ${patternSize}px`,
            opacity,
          }}
        />
      )}

      {!isLeafCanopy && style.backgroundMode === "image" && resolved.assetUrl && (
        // Admin-managed background assets are decorative and non-interactive.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          src={resolved.assetUrl}
          className="absolute inset-0 size-full object-cover"
          style={{ opacity: imageOpacity }}
        />
      )}
    </div>
  );
}
