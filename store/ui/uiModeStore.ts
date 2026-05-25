"use client";

import { create } from "zustand";

export type UiMode = "hero" | "terminal" | "desktop" | "workspace";

export const UI_MODE_LABELS: Record<UiMode, string> = {
  hero: "Hero",
  terminal: "Shell",
  desktop: "Desktop launcher",
  workspace: "Agents workspace",
};

/** Short strip hint tying modes into one DevFactory OS mental model */
export const UI_MODE_STRIP_HINTS: Partial<Record<UiMode, string>> = {
  terminal: "Kernel commands · same dock everywhere",
  desktop: "Six apps · opens shell & workspace panels",
  workspace: "Same icons as desktop · graph & memory",
};

const UI_MODE_STORAGE_KEY = "devfactory-ui-mode";

const VALID_MODES: UiMode[] = ["hero", "terminal", "desktop", "workspace"];

function isUiMode(value: string | null): value is UiMode {
  return value !== null && VALID_MODES.includes(value as UiMode);
}

function readStoredMode(): UiMode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(UI_MODE_STORAGE_KEY);
    if (isUiMode(stored)) return stored;
  } catch {
    /* ignore */
  }
  return null;
}

function persistMode(mode: UiMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

interface UiModeState {
  mode: UiMode;
  hydrated: boolean;
  setMode: (mode: UiMode) => void;
  hydrateFromStorage: () => void;
}

export const useUiModeStore = create<UiModeState>((set) => ({
  mode: typeof window !== "undefined" ? (readStoredMode() ?? "hero") : "hero",
  hydrated: typeof window !== "undefined",
  setMode: (mode) => {
    persistMode(mode);
    set({ mode });
  },
  hydrateFromStorage: () => {
    const mode = readStoredMode() ?? "hero";
    set({
      mode,
      hydrated: true,
    });
  },
}));
