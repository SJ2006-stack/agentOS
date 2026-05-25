"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

export const THEME_PRESET_STORAGE_KEY = "devfactory-theme-preset";

export const THEME_PRESETS = [
  { id: "terminal-forest", label: "Forest", swatch: "#39ff14" },
  { id: "terminal-ocean", label: "Ocean", swatch: "#38bdf8" },
  { id: "terminal-phosphor", label: "Phosphor", swatch: "#33ff33" },
  { id: "terminal-dusk", label: "Dusk", swatch: "#a78bfa" },
  { id: "dark-obsidian", label: "Obsidian", swatch: "#4ade80" },
] as const;

export type ThemePresetId = (typeof THEME_PRESETS)[number]["id"];

const DEFAULT_PRESET: ThemePresetId = "terminal-forest";

function isThemePresetId(value: string | null): value is ThemePresetId {
  return THEME_PRESETS.some((p) => p.id === value);
}

export function applyThemePreset(preset: ThemePresetId): void {
  document.documentElement.setAttribute("data-theme", preset);
  try {
    localStorage.setItem(THEME_PRESET_STORAGE_KEY, preset);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readStoredThemePreset(): ThemePresetId {
  try {
    const stored = localStorage.getItem(THEME_PRESET_STORAGE_KEY);
    if (isThemePresetId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_PRESET;
}

export function hydrateThemePreset(): ThemePresetId {
  const preset = readStoredThemePreset();
  applyThemePreset(preset);
  return preset;
}

interface ThemePresetPickerProps {
  className?: string;
}

export function ThemePresetPicker({ className }: ThemePresetPickerProps) {
  const [active, setActive] = useState<ThemePresetId>(() =>
    typeof window !== "undefined" ? readStoredThemePreset() : DEFAULT_PRESET
  );

  useEffect(() => {
    setActive(hydrateThemePreset());
  }, []);

  const selectPreset = useCallback((preset: ThemePresetId) => {
    applyThemePreset(preset);
    setActive(preset);
  }, []);

  return (
    <div
      role="group"
      aria-label="Theme color preset"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {THEME_PRESETS.map((preset) => {
        const isActive = active === preset.id;
        return (
          <Button
            key={preset.id}
            type="button"
            title={preset.label}
            aria-label={`${preset.label} preset`}
            aria-pressed={isActive}
            onClick={() => selectPreset(preset.id)}
            className={cn(
              "size-2.5 shrink-0 rounded-full border transition-transform",
              "hover:scale-125 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-os-green/60",
              isActive
                ? "scale-125 border-os-green ring-1 ring-os-green/40"
                : "border-os-border/80 opacity-70 hover:opacity-100"
            )}
            style={{ backgroundColor: preset.swatch }}
          />
        );
      })}
    </div>
  );
}
