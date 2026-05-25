import "server-only";
import { z } from "zod";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";
import {
  formatMemoryStream,
  recallGraphContext,
  recallPreferences,
  writeAgentMemory,
} from "@/lib/hydradb/memory";
import { defineTool } from "@/lib/ai/gemini-agent";
import type { AgentToolDef } from "@/lib/ai/gemini-agent";

export function createKernelTools(ctx: { taskId?: string }): AgentToolDef[] {
  return [
    defineTool({
      name: "recall_all_context",
      description:
        "Recall aggregated context from all agent memory prefixes in HydraDB",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const agg = await recallGraphContext(query, ctx.taskId);
        await broadcastOsEvent("os:memory", "recall_result", {
          query,
          chunks: agg.chunks,
          queryPaths: agg.queryPaths,
        });
        return {
          ok: true,
          chunkCount: agg.chunks.length,
          templates: Object.keys(agg.byTemplate),
          queryPaths: agg.queryPaths,
        };
      },
    }),
    defineTool({
      name: "recall_agent_context",
      description: "Recall HydraDB memory for a specific sub_tenant_id prefix",
      inputSchema: z.object({
        sub_tenant_id: z.string(),
        query: z.string(),
      }),
      execute: async ({ sub_tenant_id, query }) => {
        const r = await recallPreferences({ query, sub_tenant_id });
        await broadcastOsEvent("os:memory", "recall_result", {
          query: `${sub_tenant_id}: ${query}`,
          chunks: r.chunks,
          queryPaths: r.queryPaths,
        });
        return {
          ok: r.ok,
          chunks: r.chunks,
          queryPaths: r.queryPaths,
          error: r.error,
        };
      },
    }),
    defineTool({
      name: "stream_memory_to_user",
      description:
        "Stream formatted memory chunks for xterm display with [memory] prefix",
      inputSchema: z.object({
        query: z.string().optional(),
        sub_tenant_id: z.string().optional(),
      }),
      execute: async ({ query, sub_tenant_id }) => {
        const q = query ?? "recent operational context";
        const r = sub_tenant_id
          ? await recallPreferences({ query: q, sub_tenant_id })
          : await recallGraphContext(q, ctx.taskId);
        const chunks = sub_tenant_id
          ? (r as Awaited<ReturnType<typeof recallPreferences>>).chunks
          : (r as Awaited<ReturnType<typeof recallGraphContext>>).chunks;
        const paths = sub_tenant_id
          ? (r as Awaited<ReturnType<typeof recallPreferences>>).queryPaths
          : (r as Awaited<ReturnType<typeof recallGraphContext>>).queryPaths;
        const formatted = formatMemoryStream(chunks, paths);
        await broadcastOsEvent("os:memory", "recall_result", {
          query: q,
          chunks,
          queryPaths: paths,
        });
        return { ok: true, streamText: formatted };
      },
    }),
    defineTool({
      name: "write_kernel_memory",
      description: "Persist orchestrator operational note to HydraDB",
      inputSchema: z.object({
        text: z.string(),
        infer: z.boolean().optional(),
      }),
      execute: async ({ text, infer }) => {
        const result = await writeAgentMemory("kernel.orchestrator", text, {
          pipeline_step: "ORCHESTRATE",
          task_id: ctx.taskId,
          infer: infer ?? false,
        });
        return result;
      },
    }),
  ];
}
