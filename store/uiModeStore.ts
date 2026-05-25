"use client";

import { create } from "zustand";

export type UiMode = "hero" | "terminal" | "desktop" | "workspace";

export const UI_MODE_LABELS: Record<UiMode, string> = {
  hero: "Hero",
  terminal: "Terminal",
  desktop: "Desktop",
  workspace: "Agents",
};

const UI_MODE_STORAGE_KEY = "devfactory-ui-mode";
const VISITED_STORAGE_KEY = "devfactory-ui-mode-visited";

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

function readHasVisited(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(VISITED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistMode(mode: UiMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
    if (mode !== "hero") {
      localStorage.setItem(VISITED_STORAGE_KEY, "1");
    }
  } catch {
    /* ignore */
  }
}

interface UiModeState {
  mode: UiMode;
  hydrated: boolean;
  workspaceLocked: boolean;
  setMode: (mode: UiMode) => void;
  setWorkspaceLocked: (locked: boolean) => void;
  hydrateFromStorage: () => void;
}

export const useUiModeStore = create<UiModeState>((set) => ({
  mode: "hero",
  hydrated: false,
  workspaceLocked: true,
  setMode: (mode) => {
    persistMode(mode);
    set((s) => ({
      mode,
      workspaceLocked: mode === "workspace" ? true : s.workspaceLocked,
    }));
  },
  setWorkspaceLocked: (workspaceLocked) => set({ workspaceLocked }),
  hydrateFromStorage: () => {
    const visited = readHasVisited();
    const stored = readStoredMode();
    const mode: UiMode = visited && stored ? stored : "hero";
    set({
      mode,
      hydrated: true,
      workspaceLocked: mode === "workspace",
    });
  },
}));
