"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleHelp,
  Cpu,
  Database,
  LayoutGrid,
  Monitor,
  Network,
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

function DockItem({
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

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-3 pb-4 pt-2",
          "bg-gradient-to-t from-os-bg via-os-bg/95 to-transparent"
        )}
      >
        <form
          onSubmit={onSubmit}
          className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-xl border border-os-border bg-os-panel/90 px-3 py-2 shadow-lg backdrop-blur-md"
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

        <div className="pointer-events-auto relative">
          {spawnOpen && (
            <div
              ref={spawnRef}
              className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-lg border border-os-border bg-os-panel p-1 shadow-xl"
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
                    submitCommand(item.cmd);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <Dock direction="bottom" iconSize={36} iconMagnification={52}>
            <DockItem
              label="Monitor — focus shell"
              onClick={() => scrollToId("devfactory-shell")}
            >
              <Monitor />
            </DockItem>
            <DockItem
              label="Agents — list agents"
              onClick={() => {
                focusPanel("devfactory-agent-graph");
                submitCommand("agents");
              }}
            >
              <Network />
            </DockItem>
            <DockItem
              label="Spawn — quick menu"
              onClick={() => setSpawnOpen((o) => !o)}
            >
              <Cpu />
            </DockItem>
            <DockItem
              label="Submit — focus command input"
              onClick={() => focusCommandInput()}
            >
              <Send />
            </DockItem>
            <DockItem
              label="Memory — recall"
              onClick={() => {
                focusPanel("devfactory-memory");
                submitCommand("recall preferences");
              }}
            >
              <Database />
            </DockItem>
            <DockItem
              label="Graph — agent graph"
              onClick={() => focusPanel("devfactory-agent-graph")}
            >
              <Sparkles />
            </DockItem>
            <DockItem
              label="Overview — bento"
              onClick={() => scrollToId("devfactory-bento")}
            >
              <LayoutGrid />
            </DockItem>
            <Separator orientation="vertical" className="mx-1 h-8" />
            <DockItem
              label="Help — shell commands"
              onClick={() => submitCommand("help")}
            >
              <CircleHelp />
            </DockItem>
          </Dock>
        </div>
      </div>
    </TooltipProvider>
  );
}
