"use client";

import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import "xterm/css/xterm.css";
import {
  GATEWAY_MODELS,
  gatewayModelById,
  isGatewayModelId,
} from "@/lib/ai/models-client";
import { useOsStore } from "@/store/osStore";

type WriteFn = (text: string, prefix?: string) => void;

const PREFIX_COLORS: Record<string, string> = {
  "[kernel]": "32",
  "[cpu]": "36",
  "[gpu]": "35",
  "[memory]": "33",
  "[fault]": "31",
};

function colorForLine(line: string): string | undefined {
  for (const [prefix, color] of Object.entries(PREFIX_COLORS)) {
    if (line.startsWith(prefix)) return color;
  }
  return undefined;
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
}: {
  hydraConfigured: boolean;
  onReady?: (write: WriteFn) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const bufferRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);

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
          line.startsWith("[memory]")
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

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: xtermThemeFromCss(),
      fontFamily: "var(--font-geist-mono), JetBrains Mono, monospace",
      fontSize: 12,
      cursorBlink: true,
      scrollback: 2000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    requestAnimationFrame(() => {
      try {
        fit.fit();
      } catch {
        /* ignore */
      }
    });

    termRef.current = term;
    fitRef.current = fit;

    term.writeln("\x1b[32mDevFactory OS Shell\x1b[0m");
    term.writeln(
      "Commands: submit <task> | recall <query> | memory stream [q] | show memory | status | spawn <n> | kill <id> | config model <id>"
    );
    if (!hydraConfigured) {
      term.writeln(
        "\x1b[31m[fault] HYDRADB_API_KEY missing — copy .env.example to .env.local\x1b[0m"
      );
    }
    prompt();

    const fitTerminal = () => {
      try {
        fit.fit();
      } catch {
        /* ignore */
      }
    };

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

    onReady?.((text, prefix = "") => {
      writePrefixed(text, prefix);
      prompt();
    });

    const runCommand = async (line: string) => {
      term.write("\r\n");
      historyRef.current = [line, ...historyRef.current.filter((h) => h !== line)].slice(0, 50);
      historyIdxRef.current = -1;

      const lower = line.trim().toLowerCase();
      if (lower.startsWith("config model")) {
        const id = line.trim().slice("config model".length).trim();
        if (!id) {
          const ids = GATEWAY_MODELS.map((m) => m.id).join(", ");
          writeln(`[kernel] usage: config model <id> — ${ids}`, "32");
          prompt();
          return;
        }
        if (!isGatewayModelId(id)) {
          writeln(`[fault] unknown model "${id}"`, "31");
          prompt();
          return;
        }
        useOsStore.getState().setSelectedModelId(id);
        const label = gatewayModelById(id)?.label ?? id;
        writeln(`[kernel] gateway model → ${label} (${id})`, "32");
        prompt();
        return;
      }

      const modelId = useOsStore.getState().selectedModelId;

      try {
        const res = await fetch("/api/os/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: line, modelId }),
        });
        if (!res.ok) {
          writeln(`[fault] HTTP ${res.status}`, "31");
          prompt();
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) {
          const text = await res.text();
          writePrefixed(text, "");
          prompt();
          return;
        }
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          term.write(decoder.decode(value, { stream: true }));
        }
      } catch (e) {
        writeln(`[fault] ${e instanceof Error ? e.message : "command failed"}`, "31");
      }
      prompt();
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

    return () => {
      themeObserver.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", fitTerminal);
      term.dispose();
      termRef.current = null;
    };
  }, [hydraConfigured, onReady, writeln, writePrefixed, prompt]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded bg-os-bg [&_.xterm]:h-full [&_.xterm-viewport]:!overflow-y-auto"
    />
  );
}
