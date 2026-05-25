"use client";

import { useEffect } from "react";
import {
  dispatchShellCommand,
  SHELL_READY_EVENT,
} from "@/lib/os/shell-events";
import {
  runWorkspaceDemo,
  WORKSPACE_DEMO_COMMANDS,
} from "@/lib/os/workspace-demo";
import { type UiMode, useUiModeStore } from "@/store/ui/uiModeStore";

const PENDING_COMMAND_KEY = "devfactory-pending-command";
const PENDING_MODE_KEY = "devfactory-pending-mode";
const SKIP_BOOT_KEY = "devfactory-skip-hero-boot";
const FALLBACK_MS = 2500;

const VALID_MODES: UiMode[] = ["hero", "terminal", "desktop", "workspace"];

function isUiMode(value: string | null): value is UiMode {
  return value !== null && VALID_MODES.includes(value as UiMode);
}

function queuePendingOsCommand(command: string, mode: UiMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("devfactory-ui-mode", mode);
    sessionStorage.setItem(PENDING_COMMAND_KEY, command);
    sessionStorage.setItem(PENDING_MODE_KEY, mode);
    sessionStorage.setItem(SKIP_BOOT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function OsSpawnBootstrap() {
  useEffect(() => {
    let pending: string | null = null;
    let pendingMode: UiMode = "terminal";
    try {
      pending = sessionStorage.getItem(PENDING_COMMAND_KEY);
      if (pending) sessionStorage.removeItem(PENDING_COMMAND_KEY);
      const storedMode = sessionStorage.getItem(PENDING_MODE_KEY);
      if (isUiMode(storedMode)) pendingMode = storedMode;
      sessionStorage.removeItem(PENDING_MODE_KEY);
    } catch {
      /* ignore */
    }

    if (!pending) return;

    useUiModeStore.getState().setMode(pendingMode);

    let cancelled = false;
    let ran = false;
    const run = () => {
      if (cancelled || ran) return;
      ran = true;
      if (pendingMode === "workspace") {
        runWorkspaceDemo(pending!);
      } else {
        dispatchShellCommand(pending!);
      }
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
  queuePendingOsCommand("spawn agent cpu.plan", "terminal");
}

export function queueBuildWebAppDemo(): void {
  queuePendingOsCommand(WORKSPACE_DEMO_COMMANDS.submitWebApp, "workspace");
}

/** @deprecated Use queueBuildWebAppDemo */
export const queueBuildWebShellDemo = queueBuildWebAppDemo;

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
