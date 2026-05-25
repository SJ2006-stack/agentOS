export const SHELL_COMMAND_EVENT = "devfactory:shell-command";

export type ShellCommandDetail = { command: string };

export function dispatchShellCommand(command: string): void {
  if (typeof window === "undefined") return;
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
