"use client";

import { useEffect } from "react";

/** Poll kernel heartbeat broadcaster (validates Supabase wiring). */
export function useKernelHeartbeat() {
  useEffect(() => {
    const tick = () => {
      void fetch("/api/os/heartbeat", { method: "POST" }).catch(() => undefined);
    };
    tick();
    // 1s: httpSend broadcasts are fast (~50ms); no need to throttle to 3s
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
}
