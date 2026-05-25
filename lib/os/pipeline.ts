import "server-only";

const pipelines = new Map<
  string,
  { task: string; currentStep: string | null; completedSteps: string[] }
>();

export function createTaskId(): string {
  return `t-${Date.now().toString(36)}`;
}

export function getPipeline(taskId: string) {
  return pipelines.get(taskId);
}

export function setPipeline(
  taskId: string,
  data: { task: string; currentStep: string | null; completedSteps: string[] }
) {
  pipelines.set(taskId, data);
}

export function startPipeline(taskId: string, task: string) {
  pipelines.set(taskId, { task, currentStep: null, completedSteps: [] });
}
