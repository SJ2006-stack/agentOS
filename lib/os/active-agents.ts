import "server-only";

const activeByTask = new Map<string, Set<string>>();
let currentTaskId: string | null = null;

export function setCurrentTaskId(taskId: string): void {
  currentTaskId = taskId;
}

export function getCurrentTaskId(): string | null {
  return currentTaskId;
}

function taskKey(taskId?: string): string {
  return taskId ?? currentTaskId ?? "__shell__";
}

export function activateAgent(templateId: string, taskId?: string): void {
  const key = taskKey(taskId);
  const set = activeByTask.get(key) ?? new Set<string>();
  set.add(templateId);
  activeByTask.set(key, set);
}

export function deactivateAgent(templateId: string, taskId?: string): void {
  const key = taskKey(taskId);
  const set = activeByTask.get(key);
  if (!set) return;
  set.delete(templateId);
  if (set.size === 0) activeByTask.delete(key);
}

export function getActiveAgents(taskId?: string): string[] {
  const key = taskKey(taskId);
  return Array.from(activeByTask.get(key) ?? []);
}

export function clearActiveAgents(taskId?: string): void {
  activeByTask.delete(taskKey(taskId));
}
