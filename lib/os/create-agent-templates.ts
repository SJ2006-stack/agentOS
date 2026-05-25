import {
  AGENT_GRAPH,
  getAgentDescription,
  getAgentDisplayName,
  HYDRA_MEMORY_HUB_ID,
  type AgentTemplate,
} from "@/lib/os/agent-graph-data";

/** Actions run after the user answers the template-specific prompt. */
export type CreateAgentAction =
  | "web_search"
  | "llm_brief"
  | "memory_and_spawn";

export interface CreateAgentTemplateCard {
  templateId: string;
  displayName: string;
  description: string;
  edgesSummary: string;
  subTenantId: string;
  promptQuestion: string;
  action: CreateAgentAction;
  role: string;
}

const SKIP_TEMPLATE_IDS = new Set([HYDRA_MEMORY_HUB_ID, "user.session"]);

const DISPLAY_OVERRIDES: Record<string, string> = {
  "io.bus": "Researcher",
  "cpu.plan": "Planner",
  "cpu.route": "Router",
  "cpu.intake": "Intake",
  "cpu.dispatch": "Dispatcher",
  "cpu.verify": "Verifier",
  "cpu.commit": "Committer",
  "gpu.worker": "GPU Worker",
  "kernel.orchestrator": "Orchestrator",
};

const PROMPT_BY_TEMPLATE: Record<string, string> = {
  "io.bus": "What do you want to look into?",
  "cpu.plan": "What task should we break into steps?",
  "cpu.route": "What workloads should we route?",
  "cpu.intake": "What request should we capture?",
  "cpu.dispatch": "What work should we dispatch to GPU workers?",
  "cpu.verify": "What output should we verify?",
  "cpu.commit": "What result should we commit to memory?",
  "gpu.worker": "What parallel work should the workers run?",
  "kernel.orchestrator": "What mission should the kernel orchestrate?",
};

const ACTION_BY_TEMPLATE: Record<string, CreateAgentAction> = {
  "io.bus": "web_search",
  "cpu.plan": "llm_brief",
  "cpu.intake": "llm_brief",
  "cpu.verify": "llm_brief",
  "kernel.orchestrator": "llm_brief",
  "cpu.route": "memory_and_spawn",
  "cpu.dispatch": "memory_and_spawn",
  "cpu.commit": "memory_and_spawn",
  "gpu.worker": "memory_and_spawn",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "agent";
}

/** Per-user memory prefix: `{template.subTenantId}.{agent-slug}` */
export function memorySubTenantForCreate(
  template: AgentTemplate,
  agentName: string
): string {
  return `${template.subTenantId}.${slugify(agentName)}`;
}

function edgesSummary(template: AgentTemplate): string {
  const downstream = template.edges.filter((e) => e !== HYDRA_MEMORY_HUB_ID);
  if (!downstream.length) return "Writes to HydraDB hub";
  const labels = downstream.map((id) => {
    const n = AGENT_GRAPH[id];
    return n?.displayName ?? getAgentDisplayName(id, n?.role);
  });
  return `Routes to ${labels.join(", ")} · persists via HydraDB`;
}

function buildDescription(template: AgentTemplate): string {
  const base = getAgentDescription(template.id, template.role);
  const hub =
    template.edges.includes(HYDRA_MEMORY_HUB_ID)
      ? " Shared OS memory via hydradb.memory."
      : "";
  return `${base}${hub}`;
}

function cardFromTemplate(template: AgentTemplate): CreateAgentTemplateCard {
  const displayName =
    DISPLAY_OVERRIDES[template.id] ??
    template.displayName ??
    getAgentDisplayName(template.id, template.role);

  return {
    templateId: template.id,
    displayName,
    description: buildDescription(template),
    edgesSummary: edgesSummary(template),
    subTenantId: template.subTenantId,
    promptQuestion:
      PROMPT_BY_TEMPLATE[template.id] ??
      `What should ${displayName} work on?`,
    action: ACTION_BY_TEMPLATE[template.id] ?? "memory_and_spawn",
    role: template.role,
  };
}

/** Spawnable graph templates for the create-agent picker (excludes hub + user session). */
export function listCreateAgentTemplateCards(): CreateAgentTemplateCard[] {
  const order = [
    "io.bus",
    "cpu.plan",
    "cpu.route",
    "cpu.intake",
    "cpu.dispatch",
    "cpu.verify",
    "cpu.commit",
    "gpu.worker",
    "kernel.orchestrator",
  ];

  const byId = Object.fromEntries(
    Object.values(AGENT_GRAPH)
      .filter((t) => !SKIP_TEMPLATE_IDS.has(t.id))
      .map((t) => [t.id, cardFromTemplate(t)])
  );

  const ordered: CreateAgentTemplateCard[] = [];
  for (const id of order) {
    if (byId[id]) ordered.push(byId[id]);
  }
  for (const t of Object.values(byId)) {
    if (!ordered.some((c) => c.templateId === t.templateId)) ordered.push(t);
  }
  return ordered;
}
