"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleHelp,
  Cpu,
  Database,
  LayoutGrid,
  Lock,
  Monitor,
  Network,
  Plus,
  Send,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Dock, DockIcon } from "@/components/magicui/dock";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  dispatchShellCommand,
  focusCommandInput,
  SHELL_FOCUS_INPUT_EVENT,
} from "@/lib/os/shell-events";
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

const MODE_PREVIEW: Record<UiMode, string> = {
  hero: "AgentOS intro · telemetry · enter OS",
  terminal: "Full monitor · xterm shell · panels collapsed",
  desktop: "Aurora desktop · glass windows · icons",
  workspace: "Bento · configure · graph · CPU · memory grid",
};

const MODE_ICONS: Record<UiMode, typeof Monitor> = {
  hero: Sparkles,
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
            "relative transition-shadow duration-300",
            active &&
              "bg-os-green/10 shadow-[0_0_14px_color-mix(in_srgb,var(--os-amber)_55%,transparent)] ring-2 ring-os-amber/70"
          )}
        >
          <Icon className={cn("transition-colors", active && "text-os-amber")} />
          {active && (
            <span
              className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-os-amber shadow-[0_0_6px_var(--os-amber)]"
              aria-hidden
            />
          )}
        </DockIcon>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] p-0">
        <div className="border-b border-os-border/60 px-2 py-1 font-medium">{label}</div>
        <div
          className="mx-2 my-1.5 h-10 rounded border border-os-border/40 bg-os-bg/80"
          aria-hidden
        >
          <div className="flex h-full items-center justify-center px-2 text-[9px] leading-tight text-os-dim">
            {MODE_PREVIEW[mode]}
          </div>
        </div>
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
  const workspaceLocked = useUiModeStore((s) => s.workspaceLocked);
  const setWorkspaceLocked = useUiModeStore((s) => s.setWorkspaceLocked);

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
      if (next === "workspace") {
        setWorkspaceLocked(true);
      }
      if (next === "terminal") {
        requestAnimationFrame(() => scrollToId("devfactory-shell"));
      }
    },
    [setMode, setWorkspaceLocked]
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
          "bg-gradient-to-t from-os-bg via-os-bg/95 to-transparent"
        )}
      >
        {showCommandBar && (
          <form
            onSubmit={onSubmit}
            className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-xl border border-os-border/80 bg-os-panel/75 px-3 py-2 shadow-lg shadow-os-bg/50 backdrop-blur-xl"
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
              className="rounded-md border border-os-border px-2 py-1 text-[10px] uppercase tracking-wide text-os-amber transition-colors hover:bg-os-border/30"
            >
              Run
            </button>
          </form>
        )}

        <div className="pointer-events-auto relative">
          {spawnOpen && (
            <div
              ref={spawnRef}
              className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-lg border border-os-border bg-os-panel/95 p-1 shadow-xl backdrop-blur-xl"
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
                  className="block w-full rounded px-2 py-1.5 text-left text-xs text-os-green hover:bg-os-border/40"
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
            className="border-os-border/70 bg-os-panel/70 shadow-xl shadow-os-bg/40 backdrop-blur-xl supports-backdrop-blur:bg-os-panel/50"
          >
            <ModeDockItem
              mode="hero"
              active={mode === "hero"}
              onClick={() => enterMode("hero")}
            />
            <Separator orientation="vertical" className="mx-0.5 h-8 bg-os-border/50" />
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
              onClick={() => enterMode("workspace")}
            />
            <Separator orientation="vertical" className="mx-0.5 h-8 bg-os-border/50" />
            <UtilityDockItem
              label="Spawn — quick menu"
              onClick={() => setSpawnOpen((o) => !o)}
            >
              <Plus />
            </UtilityDockItem>
            {mode === "workspace" && workspaceLocked && (
              <UtilityDockItem
                label="Unlock workspace"
                onClick={() => setWorkspaceLocked(false)}
              >
                <Lock />
              </UtilityDockItem>
            )}
            <UtilityDockItem
              label="Submit — focus command input"
              onClick={() => {
                if (mode === "hero") enterMode("terminal");
                focusCommandInput();
              }}
            >
              <Send />
            </UtilityDockItem>
            <UtilityDockItem
              label="Memory — recall"
              onClick={() => {
                enterMode("workspace");
                setWorkspaceLocked(false);
                focusPanel("devfactory-memory");
                submitCommand("recall preferences");
              }}
            >
              <Database />
            </UtilityDockItem>
            <UtilityDockItem
              label="Monitor — focus shell"
              onClick={() => {
                enterMode("terminal");
                scrollToId("devfactory-shell");
              }}
            >
              <Monitor />
            </UtilityDockItem>
            <UtilityDockItem
              label="Agents — list agents"
              onClick={() => {
                enterMode("workspace");
                setWorkspaceLocked(false);
                focusPanel("devfactory-agent-graph");
                submitCommand("agents");
              }}
            >
              <Cpu />
            </UtilityDockItem>
            <Separator orientation="vertical" className="mx-1 h-8" />
            <UtilityDockItem
              label="Help — shell commands"
              onClick={() => {
                enterMode("terminal");
                submitCommand("help");
              }}
            >
              <CircleHelp />
            </UtilityDockItem>
          </Dock>
        </div>
      </div>
    </TooltipProvider>
  );
}
