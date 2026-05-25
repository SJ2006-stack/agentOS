import "server-only";
import { ensureTenant, getHydraClient, getHydraTenantId } from "./client";
import type { CpuStep } from "@/lib/os/types";

export const MEMORY_PREFIXES = {
  kernel: "kernel.orchestrator",
  cpu: {
    INTAKE: "cpu.intake",
    PLAN: "cpu.plan",
    ROUTE: "cpu.route",
    DISPATCH: "cpu.dispatch",
    VERIFY: "cpu.verify",
    COMMIT: "cpu.commit",
  },
  gpuWorker: (id: string) => `gpu.worker.${id}`,
  io: "io.bus",
} as const;

export const ALL_SUB_PREFIXES = [
  MEMORY_PREFIXES.kernel,
  ...Object.values(MEMORY_PREFIXES.cpu),
  MEMORY_PREFIXES.io,
] as const;

export function cpuStepPrefix(step: CpuStep): string {
  return MEMORY_PREFIXES.cpu[step];
}

export interface AddMemoryInput {
  sub_tenant_id: string;
  text: string;
  infer?: boolean;
  metadata?: Record<string, unknown>;
  title?: string;
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

export async function recallAllContext(query: string): Promise<{
  chunks: RecallChunk[];
  queryPaths: string[];
  byPrefix: Record<string, RecallChunk[]>;
}> {
  const broad = await recallPreferences({ query, max_results: 12 });
  const byPrefix: Record<string, RecallChunk[]> = {};

  await Promise.all(
    ALL_SUB_PREFIXES.map(async (prefix) => {
      const r = await recallPreferences({
        query,
        sub_tenant_id: prefix,
        max_results: 4,
      });
      if (r.chunks.length) byPrefix[prefix] = r.chunks;
    })
  );

  const listed = await listRecentMemories();
  const listChunks = listed
    .filter((m) => m.text)
    .slice(0, 6)
    .map((m) => ({
      text: `[${String(m.metadata?.agent_id ?? m.title ?? "mem")}] ${m.text}`,
    }));

  return {
    chunks: [...broad.chunks, ...listChunks].slice(0, 16),
    queryPaths: broad.queryPaths,
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
