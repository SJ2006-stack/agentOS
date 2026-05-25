import { executeOsCommand } from "@/lib/os/execute-command";
import { useUiModeStore } from "@/store/ui/uiModeStore";

export const SHELL_COMMAND_EVENT = "devfactory:shell-command";
export const SHELL_READY_EVENT = "devfactory:shell-ready";

export type ShellCommandDetail = { command: string };

const PENDING_COMMAND_TTL_MS = 5000;

let shellMountCount = 0;
const pendingCommands: Array<{ command: string; expiresAt: number }> = [];

function flushPendingCommands(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const items = pendingCommands.splice(0).filter((p) => p.expiresAt > now);
  for (const { command } of items) {
    window.dispatchEvent(
      new CustomEvent<ShellCommandDetail>(SHELL_COMMAND_EVENT, {
        detail: { command },
      })
    );
  }
}

function isShellReady(): boolean {
  return shellMountCount > 0;
}

/** Called by XtermShell once it has registered its SHELL_COMMAND_EVENT listener. */
export function notifyShellMounted(): void {
  shellMountCount += 1;
  flushPendingCommands();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
  }
}

export function notifyShellUnmounted(): void {
  shellMountCount = Math.max(0, shellMountCount - 1);
}

interface DispatchShellCommandOptions {
  /** When true (default), auto-switches to terminal mode if no shell is mounted. */
  ensureMount?: boolean;
}

/**
 * Dispatches a shell command to the active XtermShell. If no shell is currently
 * mounted, the command is queued (5s TTL) and the UI is switched to terminal
 * mode so xterm can mount and flush the queue. Pass `ensureMount: false` to
 * skip the auto-switch (used by SHELL_READY-driven bootstrap paths).
 */
export function dispatchShellCommand(
  command: string,
  options?: DispatchShellCommandOptions
): void {
  if (typeof window === "undefined") return;
  const ensureMount = options?.ensureMount ?? true;
  if (!isShellReady()) {
    pendingCommands.push({
      command,
      expiresAt: Date.now() + PENDING_COMMAND_TTL_MS,
    });
    if (ensureMount) {
      try {
        const ui = useUiModeStore.getState();
        if (ui.mode === "workspace") {
          void executeOsCommand(command);
          return;
        }
        if (ui.mode !== "terminal") ui.setMode("terminal");
      } catch {
        /* uiModeStore may not be initialized in non-browser contexts */
      }
    }
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ShellCommandDetail>(SHELL_COMMAND_EVENT, {
      detail: { command },
    })
  );
}

export const SHELL_FOCUS_INPUT_EVENT = "devfactory:focus-command-input";

export function focusCommandInput(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SHELL_FOCUS_INPUT_EVENT));
}

export const AGENT_SPAWNED_EVENT = "devfactory:agent-spawned";

export type AgentSpawnedDetail = {
  templateId: string;
  role?: string;
  taskId?: string;
};

export function dispatchAgentSpawned(detail: AgentSpawnedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AgentSpawnedDetail>(AGENT_SPAWNED_EVENT, { detail })
  );
}

export const CREATE_AGENT_OPEN_EVENT = "devfactory:create-agent-open";
export const CREATE_AGENT_COMPLETE_EVENT = "devfactory:create-agent-complete";

export function dispatchCreateAgentOpen(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CREATE_AGENT_OPEN_EVENT));
}

export function dispatchCreateAgentComplete(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CREATE_AGENT_COMPLETE_EVENT));
}
