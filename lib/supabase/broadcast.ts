import "server-only";
import type { OsChannel } from "@/lib/os/types";
import { getSupabaseAdmin } from "./server";

export async function broadcastOsEvent<T extends Record<string, unknown>>(
  channel: OsChannel,
  event: string,
  payload: T
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const ch = supabase.channel(channel);
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
    setTimeout(resolve, 800);
  });

  const result = await ch.send({
    type: "broadcast",
    event,
    payload,
  });

  await supabase.removeChannel(ch);
  return result === "ok";
}
