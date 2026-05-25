"use client";

import { useEffect } from "react";
import {
  dispatchShellCommand,
  SHELL_READY_EVENT,
} from "@/lib/os/shell-events";
import { useUiModeStore } from "@/store/uiModeStore";

const PENDING_COMMAND_KEY = "devfactory-pending-command";
const SKIP_BOOT_KEY = "devfactory-skip-hero-boot";
const FALLBACK_MS = 2500;

export function OsSpawnBootstrap() {
  useEffect(() => {
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(PENDING_COMMAND_KEY);
      if (pending) sessionStorage.removeItem(PENDING_COMMAND_KEY);
    } catch {
      /* ignore */
    }

    if (!pending) return;

    useUiModeStore.getState().setMode("terminal");

    let cancelled = false;
    let ran = false;
    const run = () => {
      if (cancelled || ran) return;
      ran = true;
      dispatchShellCommand(pending!);
    };

    const onReady = () => run();
    window.addEventListener(SHELL_READY_EVENT, onReady);
    const fallbackId = window.setTimeout(run, FALLBACK_MS);

    return () => {
      cancelled = true;
      window.removeEventListener(SHELL_READY_EVENT, onReady);
      window.clearTimeout(fallbackId);
    };
  }, []);

  return null;
}

export function queueFirstAgentSpawn(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("devfactory-ui-mode", "terminal");
    sessionStorage.setItem(PENDING_COMMAND_KEY, "spawn agent cpu.plan");
    sessionStorage.setItem(SKIP_BOOT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumeSkipHeroBoot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(SKIP_BOOT_KEY) !== "1") return false;
    sessionStorage.removeItem(SKIP_BOOT_KEY);
    return true;
  } catch {
    return false;
  }
}
