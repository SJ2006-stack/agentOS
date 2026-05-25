import "server-only";
import type { AgentTemplate } from "@/lib/os/agent-graph-data";
import { HYDRA_MEMORY_HUB_ID } from "@/lib/os/agent-graph-data";
import {
  addMemoryToHydra,
  listRecentMemories,
  writeMemoryWithBroadcast,
} from "@/lib/hydradb/memory";

export const CUSTOM_REGISTRY_SUB_TENANT = "custom.registry";

export interface CustomAgentRecord {
  id: string;
  slug: string;
  name: string;
  role: string;
  systemPrompt: string;
  subTenantId: string;
  edges: string[];
  createdAt: number;
}

const customTemplates = new Map<string, CustomAgentRecord>();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "agent";
}

export function buildCustomSystemPrompt(name: string, role: string): string {
  return `You are a custom DevFactory OS agent: ${name}.
Role: ${role}
Operate within the unified agent graph. Route through kernel.orchestrator; persist context via hydradb.memory.
Prefix every line with [agent:${slugify(name)}]. Be terse and operational (under 4 lines).`;
}

export function customTemplateId(slug: string): string {
  return `custom.${slug}`;
}

export function registerCustomAgent(input: {
  name: string;
  role: string;
}): CustomAgentRecord {
  const slug = slugify(input.name);
  const id = customTemplateId(slug);
  if (customTemplates.has(id)) {
    throw new Error(`custom agent already exists: ${id}`);
  }

  const record: CustomAgentRecord = {
    id,
    slug,
    name: input.name,
    role: input.role,
    systemPrompt: buildCustomSystemPrompt(input.name, input.role),
    subTenantId: id,
    edges: ["kernel.orchestrator", HYDRA_MEMORY_HUB_ID],
    createdAt: Date.now(),
  };

  customTemplates.set(id, record);
  return record;
}

export function getCustomTemplate(id: string): AgentTemplate | undefined {
  const rec = customTemplates.get(id);
  if (!rec) return undefined;
  return {
    id: rec.id,
    subTenantId: rec.subTenantId,
    role: rec.role,
    systemPrompt: rec.systemPrompt,
    edges: rec.edges,
  };
}

export function listCustomTemplates(): AgentTemplate[] {
  return Array.from(customTemplates.values()).map((rec) => ({
    id: rec.id,
    subTenantId: rec.subTenantId,
    role: rec.role,
    systemPrompt: rec.systemPrompt,
    edges: rec.edges,
  }));
}

export function listCustomRecords(): CustomAgentRecord[] {
  return Array.from(customTemplates.values());
}

export function isCustomTemplateId(id: string): boolean {
  return id.startsWith("custom.");
}

async function persistRegistryManifest(): Promise<void> {
  const slugs = listCustomRecords().map((r) => ({
    slug: r.slug,
    name: r.name,
    role: r.role,
    id: r.id,
    createdAt: r.createdAt,
  }));
  await addMemoryToHydra({
    sub_tenant_id: CUSTOM_REGISTRY_SUB_TENANT,
    text: `[custom-registry] ${JSON.stringify(slugs)}`,
    infer: false,
    metadata: { custom_registry: true, agents: slugs },
    title: "custom-registry-manifest",
  });
}

export async function persistCustomAgent(record: CustomAgentRecord): Promise<void> {
  await writeMemoryWithBroadcast({
    sub_tenant_id: record.subTenantId,
    text: `[custom-agent] ${record.name}: ${record.role}`,
    infer: false,
    metadata: {
      custom_agent: true,
      name: record.name,
      role: record.role,
      slug: record.slug,
      system_prompt: record.systemPrompt,
      edges: record.edges,
      agent_template: record.id,
    },
    title: `custom-${record.slug}`,
  });
  await persistRegistryManifest();
}

export async function createAndPersistCustomAgent(input: {
  name: string;
  role: string;
}): Promise<CustomAgentRecord> {
  const record = registerCustomAgent(input);
  await persistCustomAgent(record);
  return record;
}

export async function loadCustomAgentsFromHydra(): Promise<number> {
  const manifestItems = await listRecentMemories(CUSTOM_REGISTRY_SUB_TENANT);
  const latest = manifestItems.find(
    (m) => m.metadata?.custom_registry === true || m.text?.includes("[custom-registry]")
  );

  let slugs: { slug: string; name: string; role: string; id: string }[] = [];
  if (latest?.text) {
    const match = latest.text.match(/\[custom-registry\]\s*(\[[\s\S]*\])/);
    if (match) {
      try {
        slugs = JSON.parse(match[1]!) as typeof slugs;
      } catch {
        slugs = [];
      }
    }
  }

  if (!slugs.length) {
    const all = await listRecentMemories();
    for (const m of all) {
      if (m.metadata?.custom_agent !== true) continue;
      const id = String(m.metadata?.slug ? `custom.${m.metadata.slug}` : "");
      if (!id.startsWith("custom.")) continue;
      if (customTemplates.has(id)) continue;
      customTemplates.set(id, {
        id,
        slug: String(m.metadata?.slug ?? id.replace("custom.", "")),
        name: String(m.metadata?.name ?? id),
        role: String(m.metadata?.role ?? ""),
        systemPrompt: String(
          m.metadata?.system_prompt ??
            buildCustomSystemPrompt(String(m.metadata?.name ?? id), String(m.metadata?.role ?? ""))
        ),
        subTenantId: id,
        edges: ["kernel.orchestrator", HYDRA_MEMORY_HUB_ID],
        createdAt: Date.now(),
      });
    }
    return customTemplates.size;
  }

  let loaded = 0;
  for (const entry of slugs) {
    if (customTemplates.has(entry.id)) continue;
    const agentMem = await listRecentMemories(entry.id);
    const def = agentMem.find((m) => m.metadata?.custom_agent === true);
    const role = String(def?.metadata?.role ?? entry.role);
    const name = String(def?.metadata?.name ?? entry.name);
    customTemplates.set(entry.id, {
      id: entry.id,
      slug: entry.slug,
      name,
      role,
      systemPrompt: String(
        def?.metadata?.system_prompt ?? buildCustomSystemPrompt(name, role)
      ),
      subTenantId: entry.id,
      edges: ["kernel.orchestrator", HYDRA_MEMORY_HUB_ID],
      createdAt: Date.now(),
    });
    loaded += 1;
  }
  return loaded;
}
