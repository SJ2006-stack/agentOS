"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Terminal } from "lucide-react";
import { ComicText } from "@/components/ui/comic-text";
import { RippleButton } from "@/components/ui/ripple-button";
import { cn } from "@/lib/utils";
import { dispatchShellCommand, SHELL_FOCUS_INPUT_EVENT } from "@/lib/os/shell-events";
import { useOsStore } from "@/store/os/osStore";

export const DESKTOP_COMMAND_SUGGESTIONS = [
  { label: "submit build api", command: "submit build api" },
  { label: "agents", command: "agents" },
  { label: "status", command: "status" },
] as const;

type CommandBarVariant = "compact" | "hero";

export function DevFactoryCommandBar({ variant = "compact" }: { variant?: CommandBarVariant }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const selectedModelId = useOsStore((s) => s.selectedModelId);

  const submitCommand = useCallback((line: string) => {
    const cmd = line.trim();
    if (!cmd) return;
    useOsStore.getState().setKernelCommand(cmd);
    dispatchShellCommand(cmd);
    setValue("");
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCommand(value);
  };

  useEffect(() => {
    const onFocus = () => inputRef.current?.focus();
    window.addEventListener(SHELL_FOCUS_INPUT_EVENT, onFocus);
    return () => window.removeEventListener(SHELL_FOCUS_INPUT_EVENT, onFocus);
  }, []);

  if (variant === "hero") {
    return (
      <div className="w-full max-w-2xl px-2">
        <ComicText fontSize={3} className="text-center text-white/95">
          What should we build?
        </ComicText>
        <ComicText fontSize={2} className="mt-2 text-center text-white/50">
          Natural language commands — submit builds, spawn agents, check status
        </ComicText>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {DESKTOP_COMMAND_SUGGESTIONS.map(({ label, command }) => (
            <RippleButton
              key={command}
              type="button"
              onClick={() => submitCommand(command)}
              className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/85 backdrop-blur-md transition-[background-color,box-shadow,transform] hover:scale-[1.02] hover:border-white/35 hover:bg-white/15 hover:shadow-[0_0_16px_rgba(255,255,255,0.08)] active:scale-[0.98]"
            >
              <ComicText fontSize={1.2} className="text-center text-white/85">
                {label}
              </ComicText>
            </RippleButton>
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          className={cn(
            "mt-5 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4",
            "border border-white/25 bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl",
            "ring-1 ring-inset ring-white/10",
            "transition-[box-shadow,border-color] duration-300",
            "focus-within:border-sky-400/40 focus-within:shadow-[0_0_32px_rgba(56,189,248,0.15)]"
          )}
        >
          <Terminal className="size-5 shrink-0 text-white/50" aria-hidden />
          <input
            ref={inputRef}
            id="devfactory-command-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='Try "submit build api" or "create agent security-audit"'
            className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/40 sm:text-lg"
            autoComplete="off"
            spellCheck={false}
            aria-label="DevFactory shell command"
          />
          <span className="hidden text-[10px] text-white/40 sm:inline">
            {selectedModelId.split("/").pop()}
          </span>
          <RippleButton
            type="submit"
            className="shrink-0 rounded-lg border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-white transition-[background-color,box-shadow] hover:border-sky-400/40 hover:bg-sky-500/20 hover:shadow-[0_0_12px_rgba(56,189,248,0.2)]"
          >
            <ComicText fontSize={1.2} className="text-center text-white">
              Run
            </ComicText>
          </RippleButton>
        </form>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-xl px-3 py-2",
        "border border-os-border/60 bg-os-panel/50 shadow-xl shadow-os-bg/40 backdrop-blur-xl",
        "ring-1 ring-inset ring-white/[0.05]",
        "transition-[box-shadow,border-color] duration-300",
        "focus-within:border-os-green/35 focus-within:shadow-[0_0_20px_color-mix(in_srgb,var(--os-green)_15%,transparent)]"
      )}
    >
      <Terminal className="size-4 shrink-0 text-os-dim" aria-hidden />
      <input
        ref={inputRef}
        id="devfactory-command-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="commands: submit · create agent · spawn · agents · recall…"
        className="min-w-0 flex-1 bg-transparent text-sm text-os-green outline-none placeholder:text-os-dim/70"
        autoComplete="off"
        spellCheck={false}
        aria-label="DevFactory shell command"
      />
      <span className="hidden text-[10px] text-os-dim sm:inline">
        {selectedModelId.split("/").pop()}
      </span>
      <RippleButton
        type="submit"
        className="rounded-md border border-os-border/70 bg-os-bg/30 px-2 py-1 text-[10px] uppercase tracking-wide text-os-amber transition-[background-color,box-shadow] hover:border-os-amber/40 hover:bg-os-amber/10 hover:shadow-[0_0_10px_color-mix(in_srgb,var(--os-amber)_25%,transparent)]"
      >
        <ComicText fontSize={1.2} className="text-center text-os-amber">
          Run
        </ComicText>
      </RippleButton>
    </form>
  );
}
