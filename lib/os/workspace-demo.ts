import { dispatchShellCommand } from "@/lib/os/shell-events";
import { useOsStore } from "@/store/osStore";

export const WORKSPACE_DEMO_COMMANDS = {
  submitRestApi: "submit build a REST API",
  spawnPlanner: "spawn agent cpu.plan",
} as const;

export const WORKSPACE_PANEL_IDS = {
  agentGraph: "devfactory-agent-graph",
  activeTask: "devfactory-active-task",
  terminal: "devfactory-shell",
} as const;

export const WORKSPACE_FIRST_RUN_KEY = "devfactory-workspace-first-run-dismissed";

export function isWorkspaceFirstRunDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(WORKSPACE_FIRST_RUN_KEY) === "1";
  } catch {
    return true;
  }
}

export function dismissWorkspaceFirstRun(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WORKSPACE_FIRST_RUN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function highlightWorkspacePanel(id: string, durationMs = 1400): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("workspace-panel-highlight");
  window.setTimeout(() => {
    el.classList.remove("workspace-panel-highlight");
  }, durationMs);
}

export function runWorkspaceDemo(command: string): void {
  useOsStore.getState().setKernelCommand(command);
  dispatchShellCommand(command);
  highlightWorkspacePanel(WORKSPACE_PANEL_IDS.agentGraph);
  window.setTimeout(
    () => highlightWorkspacePanel(WORKSPACE_PANEL_IDS.activeTask),
    350
  );
  window.setTimeout(
    () => highlightWorkspacePanel(WORKSPACE_PANEL_IDS.terminal, 1600),
    850
  );
}
