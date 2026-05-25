"use client";

import { useEffect } from "react";

/** Poll kernel heartbeat broadcaster (validates Supabase wiring). */
export function useKernelHeartbeat() {
  useEffect(() => {
    const tick = () => {
      void fetch("/api/os/heartbeat", { method: "POST" }).catch(() => undefined);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
}
