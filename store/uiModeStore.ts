"use client";

import { create } from "zustand";

export type UiMode = "terminal" | "workspace" | "desktop";

interface UiModeState {
  mode: UiMode;
  setMode: (mode: UiMode) => void;
}

export const useUiModeStore = create<UiModeState>((set) => ({
  mode: "terminal",
  setMode: (mode) => set({ mode }),
}));
