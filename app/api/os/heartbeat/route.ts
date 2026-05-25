import { NextResponse } from "next/server";
import { broadcastOsEventFireAndForget } from "@/lib/supabase/broadcast";

const bootTime = Date.now();

export async function POST() {
  const uptimeMs = Date.now() - bootTime;
  broadcastOsEventFireAndForget("os:kernel", "heartbeat", {
    ts: Date.now(),
    uptimeMs,
    status: "online",
  });
  return NextResponse.json({ ok: true, uptimeMs });
}
