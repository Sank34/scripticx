export function normalizeAdminPoints(total: string | number, available: string | number, edited: "total" | "available") {
  const points = (value: string | number) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(1_000_000_000, Math.trunc(number))) : 0;
  };
  const totalScore = points(total);
  const rewardPoints = points(available);
  return edited === "total"
    ? { totalScore, rewardPoints: Math.min(rewardPoints, totalScore) }
    : { totalScore: Math.max(totalScore, rewardPoints), rewardPoints };
}
