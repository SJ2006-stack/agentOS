"use client";

import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { DEFAULT_GEMINI_MODEL_ID } from "@/lib/ai/models-client";
import { MODEL_CHANGE_EVENT } from "@/components/panels/ConfigurePanel";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/os/osStore";
import { withBasePath } from "@/lib/api/url";
import { parseCommandApiError } from "@/lib/os/command-errors";
import { isHydraMemoryShellCommand } from "@/lib/os/memory-shell-command";
import {
  AGENT_SPAWNED_EVENT,
  dispatchAgentSpawned,
  dispatchHydraMemoryOpen,
  notifyShellMounted,
  notifyShellUnmounted,
  SHELL_COMMAND_EVENT,
  type AgentSpawnedDetail,
  type ShellCommandDetail,
} from "@/lib/os/shell-events";

const SHELL_HELP =
  "Commands: submit <task> | spawn agent <id> | agents | agent status | create agent <name> \"<role>\" | recall <q> | memory stream | show memory | status | spawn <n> | kill <id>";

type WriteFn = (text: string, prefix?: string) => void;

const PREFIX_COLORS: Record<string, string> = {
  "[kernel]": "32",
  "[cpu]": "36",
  "[gpu]": "35",
  "[memory]": "33",
  "[agent]": "36",
  "[fault]": "31",
};

function colorForLine(line: string): string | undefined {
  for (const [prefix, color] of Object.entries(PREFIX_COLORS)) {
    if (line.startsWith(prefix)) return color;
  }
  return undefined;
}

/** xterm `write()` treats `\n` as LF-only (no CR) → staircase indent on multi-line output. */
const MEMORY_PLUMBING_RE =
  /^\[memory\].*\b(indexing|indexed|slot_write|writing|persisted)\b/i;

function filterCompactStreamChunk(chunk: string, compact: boolean): string {
  if (!compact) return chunk;
  return chunk
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      return !MEMORY_PLUMBING_RE.test(trimmed);
    })
    .join("\n");
}

function writeStreamChunk(term: Terminal, chunk: string, compact = false) {
  if (!chunk) return;
  const filtered = filterCompactStreamChunk(chunk, compact);
  if (!filtered) return;
  term.write(filtered.replace(/\r?\n/g, "\r\n"));
}

const SPAWN_STREAM_RE = /\[agent\] spawning (\S+)/;
const SPAWN_KERNEL_RE = /\[kernel\] spawn (\S+)/;

function parseSpawnTemplateId(chunk: string): string | null {
  for (const line of chunk.split("\n")) {
    const trimmed = line.trim();
    const agent = trimmed.match(SPAWN_STREAM_RE);
    if (agent) return agent[1]!;
    const kernel = trimmed.match(SPAWN_KERNEL_RE);
    if (kernel) return kernel[1]!.replace(/…$/, "");
  }
  return null;
}

function spawnSplitLine(templateId: string, cols: number): string {
  const core = ` spawn · ${templateId} `;
  const dashes = Math.max(4, Math.floor((cols - core.length) / 2));
  return `${"─".repeat(dashes)}${core}${"─".repeat(dashes)}`;
}

function xtermThemeFromCss(): {
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
} {
  const root = document.documentElement;
  const s = getComputedStyle(root);
  const pick = (name: string, fallback: string) =>
    s.getPropertyValue(name).trim() || fallback;
  return {
    background: pick("--os-bg", "#0a0f0a"),
    foreground: pick("--os-green", "#4ade80"),
    cursor: pick("--os-amber", "#fbbf24"),
    selectionBackground: pick("--os-border", "#1a2e1a"),
  };
}

export function XtermShell({
  hydraConfigured,
  onReady,
  compact = false,
}: {
  hydraConfigured: boolean;
  onReady?: (write: WriteFn) => void;
  /** Skip welcome banner — for small workspace terminal panels */
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const bufferRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const commandGenRef = useRef(0);
  const lastSpawnBannerRef = useRef<string | null>(null);
  const onReadyRef = useRef(onReady);
  const hydraConfiguredRef = useRef(hydraConfigured);
  const compactRef = useRef(compact);

  onReadyRef.current = onReady;
  hydraConfiguredRef.current = hydraConfigured;
  compactRef.current = compact;

  const writeln = useCallback((text: string, color?: string) => {
    const term = termRef.current;
    if (!term) return;
    if (color) term.write(`\x1b[${color}m`);
    term.writeln(text);
    if (color) term.write("\x1b[0m");
  }, []);

  const writePrefixed = useCallback(
    (text: string, prefix: string) => {
      const lines = text.split("\n");
      lines.forEach((line) => {
        if (!line) return;
        if (
          line.startsWith("[fault]") ||
          line.startsWith("[kernel]") ||
          line.startsWith("[cpu]") ||
          line.startsWith("[gpu]") ||
          line.startsWith("[memory]") ||
          line.startsWith("[agent]")
        ) {
          writeln(line, colorForLine(line));
        } else {
          writeln(`${prefix}${line}`);
        }
      });
    },
    [writeln]
  );

  const prompt = useCallback(() => {
    termRef.current?.write("\x1b[32m$ \x1b[0m");
  }, []);

  const writeSpawnBanner = useCallback(
    (templateId: string) => {
      const term = termRef.current;
      if (!term) return;
      if (lastSpawnBannerRef.current === templateId) return;
      lastSpawnBannerRef.current = templateId;
      window.setTimeout(() => {
        if (lastSpawnBannerRef.current === templateId) {
          lastSpawnBannerRef.current = null;
        }
      }, 3000);
      const cols = term.cols || 72;
      term.writeln(`\x1b[33m${spawnSplitLine(templateId, cols)}\x1b[0m`);
    },
    []
  );

  const maybeEmitSpawnFromChunk = useCallback(
    (chunk: string) => {
      const templateId = parseSpawnTemplateId(chunk);
      if (!templateId) return;
      dispatchAgentSpawned({ templateId });
      writeSpawnBanner(templateId);
    },
    [writeSpawnBanner]
  );

  useEffect(() => {
    // xterm ResizeObserver race suppressor — _renderer.value is briefly null during
    // terminal disposal, which can throw inside xterm's own observer callback.
    const xtermRaceSuppressor = (ev: ErrorEvent) => {
      if (
        ev.message?.includes("dimensions") &&
        (ev.message.includes("Cannot read properties of undefined") ||
          ev.message.includes("undefined is not an object"))
      ) {
        ev.preventDefault();
      }
    };
    window.addEventListener("error", xtermRaceSuppressor);

    if (!containerRef.current) {
      window.removeEventListener("error", xtermRaceSuppressor);
      return;
    }

    const term = new Terminal({
      theme: xtermThemeFromCss(),
      fontFamily: "var(--font-geist-mono), JetBrains Mono, monospace",
      fontSize: compactRef.current ? 11 : 12,
      cursorBlink: true,
      scrollback: 2000,
      convertEol: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);

    termRef.current = term;
    fitRef.current = fit;

    const fitTerminal = () => {
      const el = containerRef.current;
      if (!el || !fitRef.current || !termRef.current) return;
      if (el.offsetWidth < 2 || el.offsetHeight < 2) return;
      try {
        fitRef.current.fit();
      } catch {
        /* xterm renderer not ready yet */
      }
    };

    requestAnimationFrame(fitTerminal);

    if (!compactRef.current) {
      term.writeln("\x1b[32mDevFactory OS Shell\x1b[0m");
      term.writeln(
        "Commands: submit <task> | spawn agent <id> | agents | agent status | create agent <name> \"<role>\" | recall <q> | memory stream | show memory | status | spawn <n> | kill <id>"
      );
    }
    if (!hydraConfiguredRef.current) {
      term.writeln(
        "\x1b[31m[fault] HYDRADB_API_KEY missing — copy .env.example to .env.local\x1b[0m"
      );
    }
    prompt();

    const syncTheme = () => {
      term.options.theme = xtermThemeFromCss();
    };
    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const ro = new ResizeObserver(fitTerminal);
    ro.observe(containerRef.current);
    window.addEventListener("resize", fitTerminal);

    onReadyRef.current?.((text, prefix = "") => {
      writePrefixed(text, prefix);
      prompt();
    });

    const onModelChange = (ev: Event) => {
      const { id, label } = (ev as CustomEvent<{ id: string; label: string }>)
        .detail;
      writeln(`[kernel] model → ${label} (${id})`, "32");
      prompt();
    };
    window.addEventListener(MODEL_CHANGE_EVENT, onModelChange);

    const onAgentSpawned = (ev: Event) => {
      const { templateId } = (ev as CustomEvent<AgentSpawnedDetail>).detail;
      if (templateId) writeSpawnBanner(templateId);
    };
    window.addEventListener(AGENT_SPAWNED_EVENT, onAgentSpawned);

    const runCommand = async (line: string, echoInTerminal = false) => {
      const gen = ++commandGenRef.current;
      const activeTerm = term;
      if (echoInTerminal) {
        term.write("\r\n\x1b[32m$ \x1b[0m");
        term.writeln(line);
      }
      term.write("\r\n");
      historyRef.current = [line, ...historyRef.current.filter((h) => h !== line)].slice(0, 50);
      historyIdxRef.current = -1;

      const lower = line.trim().toLowerCase();
      if (lower === "help") {
        writeln(SHELL_HELP, "32");
        prompt();
        return;
      }
      if (lower.startsWith("config model")) {
        const id = line.trim().slice("config model".length).trim();
        if (!id || id === DEFAULT_GEMINI_MODEL_ID) {
          writeln(
            `[kernel] model fixed: ${DEFAULT_GEMINI_MODEL_ID} (Gemini Flash)`,
            "32"
          );
          useOsStore.getState().setSelectedModelId(DEFAULT_GEMINI_MODEL_ID);
          prompt();
          return;
        }
        writeln(
          `[kernel] only ${DEFAULT_GEMINI_MODEL_ID} is available — model selection is fixed`,
          "32"
        );
        prompt();
        return;
      }

      const modelId = useOsStore.getState().selectedModelId;

      if (isHydraMemoryShellCommand(line)) {
        dispatchHydraMemoryOpen();
      }

      try {
        const res = await fetch(withBasePath("/api/os/command"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: line, modelId }),
          cache: "no-store",
        });

        if (gen !== commandGenRef.current || termRef.current !== activeTerm) {
          return;
        }

        if (!res.ok) {
          const err = await parseCommandApiError(res);
          useOsStore.getState().setKernelCommandError(err.message);
          writeln(err.message, "31");
          prompt();
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          const text = await res.text();
          if (text.trim()) writePrefixed(text, "");
          else writeln("[fault] empty response from server", "31");
          prompt();
          return;
        }

        const decoder = new TextDecoder();
        let totalBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (gen !== commandGenRef.current || termRef.current !== activeTerm) {
            await reader.cancel().catch(() => undefined);
            return;
          }
          if (done) break;
          if (value?.length) {
            totalBytes += value.length;
            const chunk = decoder.decode(value, { stream: true });
            maybeEmitSpawnFromChunk(chunk);
            writeStreamChunk(activeTerm, chunk, compactRef.current);
          }
        }
        writeStreamChunk(activeTerm, decoder.decode(), compactRef.current);

        if (totalBytes === 0) {
          writeln("[fault] empty stream — check GEMINI_API_KEY in .env.local", "31");
        }
      } catch (e) {
        if (gen === commandGenRef.current && termRef.current === activeTerm) {
          const err = await parseCommandApiError(null, e);
          useOsStore.getState().setKernelCommandError(err.message);
          writeln(err.message, "31");
        }
      }
      if (gen === commandGenRef.current && termRef.current === activeTerm) {
        prompt();
      }
    };

    term.onData((data) => {
      if (data === "\r") {
        const line = bufferRef.current.trim();
        bufferRef.current = "";
        if (line) void runCommand(line);
        else {
          term.write("\r\n");
          prompt();
        }
        return;
      }
      if (data === "\u001b[A") {
        const next = historyIdxRef.current + 1;
        if (next < historyRef.current.length) {
          historyIdxRef.current = next;
          bufferRef.current = historyRef.current[next];
          term.write("\r\x1b[K");
          term.write("\x1b[32m$ \x1b[0m");
          term.write(bufferRef.current);
        }
        return;
      }
      if (data === "\u001b[B") {
        if (historyIdxRef.current > 0) {
          historyIdxRef.current -= 1;
          bufferRef.current = historyRef.current[historyIdxRef.current];
        } else {
          historyIdxRef.current = -1;
          bufferRef.current = "";
        }
        term.write("\r\x1b[K");
        term.write("\x1b[32m$ \x1b[0m");
        term.write(bufferRef.current);
        return;
      }
      if (data === "\u007f") {
        if (bufferRef.current.length > 0) {
          bufferRef.current = bufferRef.current.slice(0, -1);
          term.write("\b \b");
        }
        return;
      }
      if (data.length === 1 && data >= " ") {
        bufferRef.current += data;
        term.write(data);
      }
    });

    const onExternalCommand = (ev: Event) => {
      const { command } = (ev as CustomEvent<ShellCommandDetail>).detail;
      if (!command?.trim()) return;
      void runCommand(command.trim(), true);
    };
    window.addEventListener(SHELL_COMMAND_EVENT, onExternalCommand);

    // Ready-signal must be sent AFTER the SHELL_COMMAND_EVENT listener is
    // attached so any commands queued during mode-switch are flushed into
    // a live listener (not into the void).
    notifyShellMounted();

    return () => {
      commandGenRef.current += 1;
      notifyShellUnmounted();
      window.removeEventListener(SHELL_COMMAND_EVENT, onExternalCommand);
      window.removeEventListener(AGENT_SPAWNED_EVENT, onAgentSpawned);
      window.removeEventListener(MODEL_CHANGE_EVENT, onModelChange);
      themeObserver.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", fitTerminal);
      window.removeEventListener("error", xtermRaceSuppressor);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [writeln, writePrefixed, prompt, writeSpawnBanner, maybeEmitSpawnFromChunk]);

  useEffect(() => {
    if (!termRef.current || hydraConfigured) return;
    termRef.current.writeln(
      "\x1b[31m[fault] HYDRADB_API_KEY missing — copy .env.example to .env.local\x1b[0m"
    );
    prompt();
  }, [hydraConfigured, prompt]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full min-h-[120px] w-full rounded bg-os-bg",
        compact && "workspace-shell-compact",
        "[&_.xterm]:h-full [&_.xterm-viewport]:!overflow-y-auto [&_.xterm-viewport]:!overflow-x-hidden"
      )}
    />
  );
}
