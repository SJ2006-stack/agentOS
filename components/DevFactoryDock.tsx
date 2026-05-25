"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Home, LayoutGrid, Network, Plus, Terminal } from "lucide-react";
import { Dock, DockIcon } from "@/components/magicui/dock";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DockModePreview } from "@/components/modes/DockModePreview";
import { cn } from "@/lib/utils";
import { dispatchShellCommand, SHELL_FOCUS_INPUT_EVENT } from "@/lib/os/shell-events";
import { useOsStore } from "@/store/osStore";
import {
  UI_MODE_LABELS,
  type UiMode,
  useUiModeStore,
} from "@/store/uiModeStore";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function focusPanel(id: string) {
  scrollToId(id);
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("ring-2", "ring-os-amber/60");
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-os-amber/60");
  }, 1200);
}

const MODE_ICONS: Record<UiMode, typeof Terminal> = {
  hero: Home,
  terminal: Terminal,
  desktop: LayoutGrid,
  workspace: Network,
};

function ModeDockItem({
  mode,
  active,
  onClick,
}: {
  mode: UiMode;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = MODE_ICONS[mode];
  const label = UI_MODE_LABELS[mode];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DockIcon
          role="button"
          tabIndex={0}
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }}
          className={cn(
            "relative overflow-visible transition-[background-color,box-shadow,border-color] duration-300",
            active
              ? [
                  "border-os-amber/50 bg-gradient-to-b from-os-amber/15 to-os-green/10",
                  "shadow-[0_0_20px_color-mix(in_srgb,var(--os-amber)_45%,transparent),inset_0_1px_0_color-mix(in_srgb,white_12%,transparent)]",
                  "ring-2 ring-os-amber/80 ring-offset-1 ring-offset-os-panel/80",
                ].join(" ")
              : "hover:border-os-green/20"
          )}
        >
          {active && (
            <span
              className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-os-amber to-transparent opacity-90"
              aria-hidden
            />
          )}
          <Icon
            className={cn(
              "relative z-[1] transition-[color,transform,filter] duration-300",
              active
                ? "scale-110 text-os-amber drop-shadow-[0_0_6px_color-mix(in_srgb,var(--os-amber)_70%,transparent)]"
                : "text-os-green/85 group-hover/dock:text-os-green"
            )}
          />
          {active && (
            <span
              className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-os-amber shadow-[0_0_8px_var(--os-amber),0_0_14px_color-mix(in_srgb,var(--os-amber)_50%,transparent)]"
              aria-hidden
            />
          )}
        </DockIcon>
      </TooltipTrigger>
      <TooltipContent side="top" className="border-0 bg-transparent p-0 shadow-none">
        <DockModePreview mode={mode} />
        <span className="sr-only">
          {label}
          {active ? " (active)" : ""}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function UtilityDockItem({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DockIcon
          role="button"
          tabIndex={0}
          aria-label={label}
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }}
        >
          {children}
        </DockIcon>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function DevFactoryDock() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [spawnOpen, setSpawnOpen] = useState(false);
  const spawnRef = useRef<HTMLDivElement>(null);
  const selectedModelId = useOsStore((s) => s.selectedModelId);
  const mode = useUiModeStore((s) => s.mode);
  const setMode = useUiModeStore((s) => s.setMode);

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

  const enterMode = useCallback(
    (next: UiMode) => {
      setMode(next);
      if (next === "terminal") {
        requestAnimationFrame(() => scrollToId("devfactory-shell"));
      }
    },
    [setMode]
  );

  useEffect(() => {
    const onFocus = () => inputRef.current?.focus();
    window.addEventListener(SHELL_FOCUS_INPUT_EVENT, onFocus);
    return () => window.removeEventListener(SHELL_FOCUS_INPUT_EVENT, onFocus);
  }, []);

  useEffect(() => {
    if (!spawnOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (spawnRef.current && !spawnRef.current.contains(e.target as Node)) {
        setSpawnOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [spawnOpen]);

  const showCommandBar = mode !== "hero";

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-3 pb-4 pt-2",
          "bg-gradient-to-t from-os-bg via-os-bg/90 to-transparent",
          "before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-32 before:bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,color-mix(in_srgb,var(--os-green)_8%,transparent),transparent)]"
        )}
      >
        {showCommandBar && (
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
              placeholder="submit build api · agents · recall preferences…"
              className="min-w-0 flex-1 bg-transparent text-sm text-os-green outline-none placeholder:text-os-dim/70"
              autoComplete="off"
              spellCheck={false}
              aria-label="DevFactory shell command"
            />
            <span className="hidden text-[10px] text-os-dim sm:inline">
              {selectedModelId.split("/").pop()}
            </span>
            <button
              type="submit"
              className="rounded-md border border-os-border/70 bg-os-bg/30 px-2 py-1 text-[10px] uppercase tracking-wide text-os-amber transition-[background-color,box-shadow] hover:border-os-amber/40 hover:bg-os-amber/10 hover:shadow-[0_0_10px_color-mix(in_srgb,var(--os-amber)_25%,transparent)]"
            >
              Run
            </button>
          </form>
        )}

        <div className="pointer-events-auto relative">
          {spawnOpen && (
            <div
              ref={spawnRef}
              className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-xl border border-os-border/70 bg-os-panel/80 p-1 shadow-2xl shadow-os-bg/50 ring-1 ring-inset ring-white/[0.06] backdrop-blur-xl"
            >
              {[
                { label: "Agent status", cmd: "agent status" },
                { label: "List agents", cmd: "agents" },
                { label: "Spawn cpu.plan", cmd: "spawn agent cpu.plan" },
                { label: "System status", cmd: "status" },
              ].map((item) => (
                <button
                  key={item.cmd}
                  type="button"
                  className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-os-green transition-colors hover:bg-os-green/10 hover:text-os-amber"
                  onClick={() => {
                    setSpawnOpen(false);
                    enterMode("terminal");
                    submitCommand(item.cmd);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <Dock
            direction="bottom"
            iconSize={36}
            iconMagnification={52}
            className="group/dock gap-1.5 px-2.5"
          >
            <ModeDockItem
              mode="hero"
              active={mode === "hero"}
              onClick={() => enterMode("hero")}
            />
            <ModeDockItem
              mode="terminal"
              active={mode === "terminal"}
              onClick={() => enterMode("terminal")}
            />
            <ModeDockItem
              mode="desktop"
              active={mode === "desktop"}
              onClick={() => enterMode("desktop")}
            />
            <ModeDockItem
              mode="workspace"
              active={mode === "workspace"}
              onClick={() => {
                enterMode("workspace");
                focusPanel("devfactory-agent-graph");
              }}
            />
            <UtilityDockItem
              label="Spawn — quick menu"
              onClick={() => setSpawnOpen((o) => !o)}
            >
              <Plus />
            </UtilityDockItem>
          </Dock>
        </div>
      </div>
    </TooltipProvider>
  );
}
