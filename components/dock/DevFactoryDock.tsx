"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, LayoutGrid, Network, Plus, Terminal } from "lucide-react";
import { DevFactoryCommandBar } from "@/components/dock/DevFactoryCommandBar";
import { Dock, DockIcon } from "@/components/magicui/dock";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DockModePreview } from "@/components/modes/DockModePreview";
import { CoolMode, DEFAULT_COOL_MODE_OPTIONS } from "@/components/ui/cool-mode";
import { cn } from "@/lib/utils";
import {
  dispatchCreateAgentOpen,
  dispatchShellCommand,
} from "@/lib/os/shell-events";
import { useOsStore } from "@/store/os/osStore";
import {
  UI_MODE_LABELS,
  type UiMode,
  useUiModeStore,
} from "@/store/ui/uiModeStore";

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
        <CoolMode options={DEFAULT_COOL_MODE_OPTIONS} className="inline-flex">
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
        </CoolMode>
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
        <CoolMode options={DEFAULT_COOL_MODE_OPTIONS} className="inline-flex">
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
        </CoolMode>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function DevFactoryDock({
  hydraConfigured: _hydraConfigured,
}: {
  hydraConfigured: boolean;
}) {
  const [spawnOpen, setSpawnOpen] = useState(false);
  const spawnRef = useRef<HTMLDivElement>(null);
  const mode = useUiModeStore((s) => s.mode);
  const setMode = useUiModeStore((s) => s.setMode);

  const submitCommand = useCallback((line: string) => {
    const cmd = line.trim();
    if (!cmd) return;
    useOsStore.getState().setKernelCommand(cmd);
    dispatchShellCommand(cmd);
  }, []);

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
    if (!spawnOpen) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (spawnOpen && spawnRef.current && !spawnRef.current.contains(target)) {
        setSpawnOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [spawnOpen]);

  const openCreateAgent = useCallback(() => {
    setSpawnOpen(false);
    dispatchCreateAgentOpen();
    requestAnimationFrame(() =>
      document.getElementById("devfactory-command-input")?.blur()
    );
  }, []);

  const showCommandBar = mode !== "hero" && mode !== "desktop";

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
          <div className="pointer-events-auto w-full max-w-xl">
            <DevFactoryCommandBar variant="compact" />
          </div>
        )}

        <div className="pointer-events-auto relative">
          {spawnOpen && (
            <div
              ref={spawnRef}
              className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-xl border border-os-border/70 bg-os-panel/80 p-1 shadow-2xl shadow-os-bg/50 ring-1 ring-inset ring-white/[0.06] backdrop-blur-xl"
            >
              {[
                {
                  label: "Create agent…",
                  action: openCreateAgent,
                },
                {
                  label: "Agent status",
                  action: () => {
                    setSpawnOpen(false);
                    enterMode("terminal");
                    submitCommand("agent status");
                  },
                },
                {
                  label: "List agents",
                  action: () => {
                    setSpawnOpen(false);
                    enterMode("terminal");
                    submitCommand("agents");
                  },
                },
                {
                  label: "Spawn cpu.plan",
                  action: () => {
                    setSpawnOpen(false);
                    enterMode("terminal");
                    submitCommand("spawn agent cpu.plan");
                  },
                },
                {
                  label: "System status",
                  action: () => {
                    setSpawnOpen(false);
                    enterMode("terminal");
                    submitCommand("status");
                  },
                },
              ].map((item) => (
                <Button coolMode
                  key={item.label}
                  type="button"
                  className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-os-green transition-colors hover:bg-os-green/10 hover:text-os-amber"
                  onClick={item.action}
                >
                  <span className="text-left text-os-green">
                    {item.label}
                  </span>
                </Button>
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
