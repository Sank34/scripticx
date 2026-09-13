export const NETWORK_RECOVERED_EVENT = "scripticx:network-recovered";

export const NETWORK_RETRY_DELAYS_MS = [
  5_000,
  15_000,
  30_000,
  60_000,
  120_000,
  300_000,
] as const;

export function getNetworkRetryDelay(attempt: number) {
  const safeAttempt = Number.isFinite(attempt)
    ? Math.max(0, Math.floor(attempt))
    : 0;

  return NETWORK_RETRY_DELAYS_MS[
    Math.min(safeAttempt, NETWORK_RETRY_DELAYS_MS.length - 1)
  ];
}
