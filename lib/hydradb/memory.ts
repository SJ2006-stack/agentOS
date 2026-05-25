import "server-only";
import { getAgentTemplate } from "@/lib/os/agent-graph";
import {
  GRAPH_RECALL_PREFIXES,
  HYDRA_MEMORY_HUB_ID,
  templateIdForCpuStep,
} from "@/lib/os/agent-graph-data";
import { ensureTenant, getHydraClient, getHydraTenantId } from "./client";
import type { CpuStep } from "@/lib/os/types";

export const MEMORY_PREFIXES = {
  kernel: "kernel.orchestrator",
  user: "user.session",
  cpu: {
    INTAKE: "cpu.intake",
    PLAN: "cpu.plan",
    ROUTE: "cpu.route",
    DISPATCH: "cpu.dispatch",
    VERIFY: "cpu.verify",
    COMMIT: "cpu.commit",
  },
  gpuWorker: (id: string) => `gpu.worker.${id}`,
  gpuTemplate: "gpu.worker",
  io: "io.bus",
  hub: HYDRA_MEMORY_HUB_ID,
} as const;

export const ALL_SUB_PREFIXES = [
  MEMORY_PREFIXES.user,
  MEMORY_PREFIXES.kernel,
  ...Object.values(MEMORY_PREFIXES.cpu),
  MEMORY_PREFIXES.io,
  MEMORY_PREFIXES.hub,
] as const;

/** taskId → templateId → Hydra source_id for forceful graph relations */
const taskMemoryRegistry = new Map<string, Map<string, string>>();

export function linkTaskMemory(
  taskId: string,
  templateId: string,
  memoryId: string
): void {
  let map = taskMemoryRegistry.get(taskId);
  if (!map) {
    map = new Map();
    taskMemoryRegistry.set(taskId, map);
  }
  map.set(templateId, memoryId);
}

export function getLinkedMemoryIds(
  taskId: string,
  templateIds: string[]
): string[] {
  const map = taskMemoryRegistry.get(taskId);
  if (!map) return [];
  return templateIds
    .map((id) => map.get(id))
    .filter((id): id is string => Boolean(id));
}

export function cpuStepPrefix(step: CpuStep): string {
  return templateIdForCpuStep(step);
}

export interface AddMemoryInput {
  sub_tenant_id: string;
  text: string;
  infer?: boolean;
  metadata?: Record<string, unknown>;
  title?: string;
  relations?: {
    cortex_source_ids?: string[];
    properties?: Record<string, unknown>;
  };
}

export interface RecallChunk {
  text: string;
  score?: number;
}

/** Persist to HydraDB first, then broadcast `os:memory` (live-only contract). */
export async function writeMemoryWithBroadcast(
  input: AddMemoryInput
): Promise<{ ok: boolean; memoryId?: string; error?: string }> {
  const result = await addMemoryToHydra(input);
  if (!result.ok) return result;

  const { broadcastOsEvent } = await import("@/lib/supabase/broadcast");
  await broadcastOsEvent("os:memory", "slot_write", {
    memoryId: result.memoryId,
    agentId: input.sub_tenant_id,
    preview: input.text.slice(0, 80),
    status: "indexed",
  });
  return result;
}

export async function addMemoryToHydra(input: AddMemoryInput): Promise<{
  ok: boolean;
  memoryId?: string;
  error?: string;
}> {
  const hydra = getHydraClient();
  if (!hydra) return { ok: false, error: "HYDRADB_API_KEY not configured" };

  const tenantId = (await ensureTenant()) ?? getHydraTenantId();
  const infer = input.infer ?? false;

  try {
    const body = await hydra.upload.addMemory({
      tenant_id: tenantId,
      sub_tenant_id: input.sub_tenant_id,
      upsert: true,
      memories: [
        {
          text: input.text,
          title: input.title ?? `os-${Date.now()}`,
          infer,
          metadata: input.metadata,
          relations: input.relations?.cortex_source_ids?.length
            ? {
                cortex_source_ids: input.relations.cortex_source_ids,
                properties: input.relations.properties ?? null,
              }
            : undefined,
        },
      ],
    });
    const memoryId = body.results?.[0]?.source_id;
    return { ok: true, memoryId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "add_memory failed",
    };
  }
}

export async function recallPreferences(input: {
  query: string;
  sub_tenant_id?: string;
  max_results?: number;
}): Promise<{
  ok: boolean;
  chunks: RecallChunk[];
  queryPaths: string[];
  error?: string;
}> {
  const hydra = getHydraClient();
  if (!hydra) {
    return { ok: false, chunks: [], queryPaths: [], error: "HYDRADB_API_KEY not configured" };
  }

  const tenantId = getHydraTenantId();
  try {
    const data = await hydra.recall.recallPreferences({
      tenant_id: tenantId,
      sub_tenant_id: input.sub_tenant_id,
      query: input.query,
      max_results: input.max_results ?? 8,
      graph_context: true,
      search_forceful_relations: true,
    });
    const chunks =
      data.chunks?.map((c) => ({
        text: c.chunk_content ?? "",
        score: c.relevancy_score ?? undefined,
      })) ?? [];
    const paths =
      data.graph_context?.query_paths?.map((p) => JSON.stringify(p).slice(0, 80)) ??
      [];
    return { ok: true, chunks, queryPaths: paths };
  } catch (e) {
    return {
      ok: false,
      chunks: [],
      queryPaths: [],
      error: e instanceof Error ? e.message : "recall failed",
    };
  }
}

export async function listRecentMemories(sub_tenant_id?: string): Promise<
  { id?: string; text?: string; title?: string; metadata?: Record<string, unknown> }[]
> {
  const hydra = getHydraClient();
  if (!hydra) return [];

  const tenantId = getHydraTenantId();
  try {
    const body = await hydra.fetch.listData({
      tenant_id: tenantId,
      sub_tenant_id: sub_tenant_id,
      kind: "memories",
      page: 1,
      page_size: 20,
    });
    const items =
      (body as { data?: Record<string, unknown>[] }).data ??
      (body as { user_memories?: Record<string, unknown>[] }).user_memories ??
      [];
    return items.map((m) => ({
      id: String(m.id ?? m.memory_id ?? ""),
      text: String(m.text ?? m.content ?? ""),
      title: String(m.title ?? ""),
      metadata: (m.metadata as Record<string, unknown>) ?? {},
    }));
  } catch {
    return [];
  }
}

export async function writeAgentMemory(
  templateId: string,
  text: string,
  metadata: Record<string, unknown> = {}
): Promise<{ ok: boolean; memoryId?: string; error?: string }> {
  const template = getAgentTemplate(templateId);
  if (!template) {
    return { ok: false, error: `unknown agent template: ${templateId}` };
  }

  const subTenantOverride = metadata.sub_tenant_override as string | undefined;
  const subTenantId = subTenantOverride ?? template.subTenantId;
  const taskId = String(metadata.task_id ?? metadata.taskId ?? "");
  const userTurnId = String(metadata.user_turn_id ?? metadata.userTurnId ?? "");
  const relatedIds: string[] = [];

  if (taskId) {
    const upstream = getAgentTemplate(templateId)?.edges.filter(
      (e) => e !== HYDRA_MEMORY_HUB_ID
    );
    relatedIds.push(...getLinkedMemoryIds(taskId, upstream ?? []));
    if (userTurnId) {
      relatedIds.push(...getLinkedMemoryIds(taskId, ["user.session"]));
    }
  }

  const metaRest = { ...metadata };
  delete metaRest.sub_tenant_override;
  const result = await writeMemoryWithBroadcast({
    sub_tenant_id: subTenantId,
    text,
    infer: false,
    metadata: {
      ...metaRest,
      agent_template: templateId,
      agent_id: subTenantId,
      user_turn_id: userTurnId || undefined,
    },
    title: `graph-${templateId}-${Date.now()}`,
    relations:
      relatedIds.length > 0
        ? {
            cortex_source_ids: [...new Set(relatedIds)],
            properties: {
              task_id: taskId || undefined,
              from_template: templateId,
            },
          }
        : undefined,
  });

  if (result.ok && result.memoryId && taskId) {
    linkTaskMemory(taskId, templateId, result.memoryId);
  }

  return result;
}

export async function writeUserInteraction(
  command: string,
  responseSummary: string,
  taskId?: string
): Promise<{ ok: boolean; memoryId?: string; userTurnId?: string; error?: string }> {
  const userTurnId = `turn-${Date.now()}`;
  const text = `[user] ${command}\n[response] ${responseSummary.slice(0, 500)}`;

  const result = await writeAgentMemory("user.session", text, {
    agent_template: "user.session",
    pipeline_step: "USER",
    task_id: taskId,
    user_turn_id: userTurnId,
    command,
  });

  if (result.ok && result.memoryId && taskId) {
    linkTaskMemory(taskId, "user.session", result.memoryId);
  }

  return { ...result, userTurnId };
}

export async function recallGraphContext(
  query: string,
  taskId?: string
): Promise<{
  ok: boolean;
  chunks: RecallChunk[];
  queryPaths: string[];
  byTemplate: Record<string, RecallChunk[]>;
  error?: string;
}> {
  const prefixes = [...GRAPH_RECALL_PREFIXES];

  const broad = await recallPreferences({
    query,
    max_results: 10,
    sub_tenant_id: undefined,
  });

  const byTemplate: Record<string, RecallChunk[]> = {};

  await Promise.all(
    prefixes.map(async (prefix) => {
      const r = await recallPreferences({
        query: taskId ? `${query} task:${taskId}` : query,
        sub_tenant_id: prefix,
        max_results: 4,
      });
      if (r.chunks.length) byTemplate[prefix] = r.chunks;
    })
  );

  const forceful = await recallPreferences({
    query,
    max_results: 8,
  });

  const merged = [
    ...broad.chunks,
    ...Object.values(byTemplate).flat(),
    ...forceful.chunks,
  ];
  const seen = new Set<string>();
  const chunks = merged.filter((c) => {
    const key = c.text.slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    ok: broad.ok || forceful.ok,
    chunks: chunks.slice(0, 20),
    queryPaths: [...broad.queryPaths, ...forceful.queryPaths],
    byTemplate,
    error: broad.error ?? forceful.error,
  };
}

export async function recallAllContext(query: string): Promise<{
  chunks: RecallChunk[];
  queryPaths: string[];
  byPrefix: Record<string, RecallChunk[]>;
}> {
  const graph = await recallGraphContext(query);
  const byPrefix = graph.byTemplate;

  const listed = await listRecentMemories();
  const listChunks = listed
    .filter((m) => m.text)
    .slice(0, 6)
    .map((m) => ({
      text: `[${String(m.metadata?.agent_template ?? m.metadata?.agent_id ?? m.title ?? "mem")}] ${m.text}`,
    }));

  return {
    chunks: [...graph.chunks, ...listChunks].slice(0, 16),
    queryPaths: graph.queryPaths,
    byPrefix,
  };
}

export async function bootHydraMemorySlots(): Promise<{ ok: boolean; seeded: number }> {
  const hydra = getHydraClient();
  if (!hydra) return { ok: false, seeded: 0 };

  await ensureTenant();
  let seeded = 0;

  for (const prefix of ALL_SUB_PREFIXES) {
    const existing = await listRecentMemories(prefix);
    const hasBoot = existing.some(
      (m) => m.metadata?.boot_slot === true || m.text?.includes("[boot-slot]")
    );
    if (hasBoot) continue;

    const result = await writeMemoryWithBroadcast({
      sub_tenant_id: prefix,
      text: `[boot-slot] DevFactory OS memory channel ready for ${prefix}`,
      infer: false,
      metadata: {
        boot_slot: true,
        agent_id: prefix,
        pipeline_step: "BOOT",
      },
    });
    if (result.ok) seeded += 1;
  }

  return { ok: true, seeded };
}

export function formatMemoryStream(chunks: RecallChunk[], queryPaths?: string[]): string {
  const lines: string[] = [];
  chunks.forEach((c, i) => {
    lines.push(`[memory] chunk ${i + 1}: ${c.text.slice(0, 200)}`);
    if (c.score != null) lines.push(`[memory]   score=${c.score.toFixed(3)}`);
  });
  if (queryPaths?.length) {
    lines.push(`[memory] graph paths: ${queryPaths.join(" → ")}`);
  }
  if (!lines.length) lines.push("[memory] no memories found");
  return lines.join("\n");
}
