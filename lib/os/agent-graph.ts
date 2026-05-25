import "server-only";
import { getCustomTemplate, listCustomTemplates } from "@/lib/os/custom-registry";
export type { AgentTemplate } from "@/lib/os/agent-graph-data";
export {
  AGENT_GRAPH,
  AGENT_GRAPH_IDS,
  getBuiltinTemplate,
  getDownstreamAgents,
  gpuWorkerTemplateId,
  GRAPH_RECALL_PREFIXES,
  HYDRA_MEMORY_HUB_ID,
  subTenantForGpuWorker,
  templateIdForCpuStep,
} from "@/lib/os/agent-graph-data";

import { AGENT_GRAPH } from "@/lib/os/agent-graph-data";
import type { AgentTemplate } from "@/lib/os/agent-graph-data";

export function getAgentTemplate(id: string): AgentTemplate | undefined {
  return AGENT_GRAPH[id] ?? getCustomTemplate(id);
}

export function listAllAgentTemplates(): AgentTemplate[] {
  return [...Object.values(AGENT_GRAPH), ...listCustomTemplates()];
}

export function listAllAgentTemplateIds(): string[] {
  return listAllAgentTemplates().map((t) => t.id);
}

export function isHydradbHub(id: string): boolean {
  return id === "hydradb.memory";
}
