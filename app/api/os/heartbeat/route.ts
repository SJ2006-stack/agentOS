import { NextResponse } from "next/server";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";

const bootTime = Date.now();

export async function POST() {
  const uptimeMs = Date.now() - bootTime;
  const ok = await broadcastOsEvent("os:kernel", "heartbeat", {
    ts: Date.now(),
    uptimeMs,
    status: "online",
  });
  await broadcastOsEvent("os:kernel", "uptime", {
    ts: Date.now(),
    uptimeMs,
    status: ok ? "online" : "degraded",
  });
  return NextResponse.json({ ok, uptimeMs });
}
