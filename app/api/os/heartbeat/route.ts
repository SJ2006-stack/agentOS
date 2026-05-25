export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { broadcastOsEventFireAndForget } from "@/lib/supabase/broadcast";

const bootTime = Date.now();


function heartbeatPayload() {
  const uptimeMs = Date.now() - bootTime;
  broadcastOsEventFireAndForget("os:kernel", "heartbeat", {
    ts: Date.now(),
    uptimeMs,
    status: "online",
  });
  return { ok: true as const, uptimeMs };
}

/** POST — primary path (shell poll + recommended for monitors). */
export async function POST() {
  const { ok, uptimeMs } = heartbeatPayload();
  return NextResponse.json({ ok, uptimeMs });
}

/** GET — same payload for load balancers that only allow GET probes. */
export async function GET() {
  const { ok, uptimeMs } = heartbeatPayload();
  return NextResponse.json({ ok, uptimeMs });
}
