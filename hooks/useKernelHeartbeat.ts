"use client";

import { useEffect } from "react";

const HEARTBEAT_MS = 5000;

/** Poll kernel heartbeat when tab is visible (skips hidden tabs). */
export function useKernelHeartbeat() {
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (document.visibilityState === "hidden") return;
      void fetch("/api/os/heartbeat", { method: "POST" }).catch(() => undefined);
    };

    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const start = () => {
      stop();
      tick();
      intervalId = setInterval(tick, HEARTBEAT_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        start();
      }
    };

    if (document.visibilityState !== "hidden") {
      start();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
