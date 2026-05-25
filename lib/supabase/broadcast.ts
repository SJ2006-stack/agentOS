import "server-only";
import type { OsChannel } from "@/lib/os/types";
import { getSupabaseAdmin } from "./server";

/** Server-side broadcast via REST (no subscribe / 800ms wait). */
export async function broadcastOsEvent<T extends Record<string, unknown>>(
  channel: OsChannel,
  event: string,
  payload: T
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const ch = supabase.channel(channel);
  try {
    await ch.httpSend(event, payload);
    return true;
  } catch {
    return false;
  } finally {
    void supabase.removeChannel(ch);
  }
}

/** Heartbeat-friendly broadcast — does not block response on channel teardown. */
export function broadcastOsEventFireAndForget<T extends Record<string, unknown>>(
  channel: OsChannel,
  event: string,
  payload: T
): void {
  void broadcastOsEvent(channel, event, payload);
}
