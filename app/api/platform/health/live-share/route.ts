import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

const PROBE_TIMEOUT_MS = 10_000;
const PROBE_INTERVAL_MS = 10_000;
const PROBE_EVENT = "health-probe";

type ProbeResult = {
  service: "live-share";
  status: "operational" | "outage";
  checkedAt: string;
  durationMs: number;
};

let inFlight: Promise<ProbeResult> | null = null;
let previousResult: ProbeResult | null = null;
let previousResultAt = 0;

async function probeLiveShare(): Promise<ProbeResult> {
  const startedAt = Date.now();
  let client: ReturnType<typeof createServerSupabase> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let healthy = false;

  try {
    client = createServerSupabase({ fetchTimeoutMs: PROBE_TIMEOUT_MS });
    const nonce = randomUUID();
    const channel = client.channel(`health-live-share-${nonce}`, {
      config: { broadcast: { self: true, ack: true } },
    });
    healthy = await new Promise<boolean>((resolve) => {
      let sent = false;
      let acknowledged = false;
      let received = false;
      let settled = false;
      const finish = (success: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(success);
      };
      timeout = setTimeout(() => finish(false), PROBE_TIMEOUT_MS);
      channel.on("broadcast", { event: PROBE_EVENT }, ({ payload }) => {
        if (payload?.nonce !== nonce) return;
        received = true;
        if (acknowledged) finish(true);
      });
      channel.subscribe((status) => {
        if (settled) return;
        if (status === "SUBSCRIBED" && !sent) {
          sent = true;
          void channel.send({
            type: "broadcast",
            event: PROBE_EVENT,
            payload: { nonce },
          }, { timeout: PROBE_TIMEOUT_MS }).then((result) => {
            acknowledged = result === "ok";
            if (!acknowledged) finish(false);
            else if (received) finish(true);
          }).catch(() => finish(false));
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          finish(false);
        }
      }, PROBE_TIMEOUT_MS);
    });
  } catch (error) {
    console.error("Live Share health probe failed:", error);
  } finally {
    clearTimeout(timeout);
    // Closing this dedicated socket releases the temporary channel and its reconnect timers.
    try {
      await client?.realtime.disconnect();
    } catch (error) {
      console.warn("Could not close Live Share health probe:", error);
    }
  }

  return {
    service: "live-share",
    status: healthy ? "operational" : "outage",
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  };
}

export async function GET() {
  if (!previousResult || Date.now() - previousResultAt >= PROBE_INTERVAL_MS) {
    // Concurrent monitors share one check instead of opening multiple sockets.
    inFlight ??= probeLiveShare().then((result) => {
      previousResult = result;
      previousResultAt = Date.now();
      return result;
    }).finally(() => { inFlight = null; });
  }
  const result = inFlight ? await inFlight : previousResult!;
  return NextResponse.json(result, {
    status: result.status === "operational" ? 200 : 503,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
