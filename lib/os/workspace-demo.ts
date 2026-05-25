import { dispatchShellCommand } from "@/lib/os/shell-events";
import { useOsStore } from "@/store/os/osStore";

export const WORKSPACE_DEMO_COMMANDS = {
  /** Primary — builds hosted web app at /demo */
  submitWebApp: "submit build agent dashboard app",
  /** Alias for scripts and older copy */
  submitWebShell: "submit build agent dashboard shell",
  submitRestApi: "submit build a REST API",
  spawnPlanner: "spawn agent cpu.plan",
} as const;

export const WORKSPACE_DEMO_CHIPS = [
  {
    label: "Build web app",
    hint: "Live code assembly → deploy URL",
    command: WORKSPACE_DEMO_COMMANDS.submitWebApp,
  },
  {
    label: "Build REST API",
    hint: "Full CPU pipeline → GPU dispatch",
    command: WORKSPACE_DEMO_COMMANDS.submitRestApi,
  },
  {
    label: "Spawn planner",
    hint: "cpu.plan agent on graph",
    command: WORKSPACE_DEMO_COMMANDS.spawnPlanner,
  },
] as const;

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
    400
  );
}
