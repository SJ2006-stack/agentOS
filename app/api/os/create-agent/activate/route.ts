export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { GEMINI_KEY_FAULT } from "@/lib/ai/faults";
import { agentNeedsLlm } from "@/lib/ai/agent-llm-policy";
import { isGeminiConfigured, resolveModelId } from "@/lib/ai/model";
import { streamChatContent } from "@/lib/ai/gemini-agent";
import { isHydraConfigured } from "@/lib/hydradb/client";
import { writeAgentMemory, writeUserInteraction } from "@/lib/hydradb/memory";
import { getAgentTemplate } from "@/lib/os/agent-graph";
import { spawnAgentTemplate } from "@/lib/os/agent-spawn";
import {
  listCreateAgentTemplateCards,
  memorySubTenantForCreate,
  type CreateAgentAction,
} from "@/lib/os/create-agent-templates";
import { createTaskId } from "@/lib/os/pipeline";
import { setCurrentTaskId } from "@/lib/os/active-agents";
import { formatSearchForMemory, runWebSearch } from "@/lib/os/web-search";
import { absoluteApiUrl } from "@/lib/api/url";

const ACTION_BY_ID = Object.fromEntries(
  listCreateAgentTemplateCards().map((c) => [c.templateId, c.action])
) as Record<string, CreateAgentAction>;

export async function POST(req: Request) {
  if (!isHydraConfigured()) {
    return NextResponse.json(
      { ok: false, error: "HYDRADB_API_KEY not configured" },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    templateId?: string;
    agentName?: string;
    userQuery?: string;
    taskId?: string;
  };

  const templateId = body.templateId?.trim() ?? "";
  const agentName = body.agentName?.trim() ?? "";
  const userQuery = body.userQuery?.trim() ?? "";

  if (!templateId || !agentName || !userQuery) {
    return NextResponse.json(
      { ok: false, error: "templateId, agentName, and userQuery are required" },
      { status: 400 }
    );
  }

  const template = getAgentTemplate(templateId);
  if (!template) {
    return NextResponse.json(
      { ok: false, error: `unknown template: ${templateId}` },
      { status: 404 }
    );
  }

  const action = ACTION_BY_ID[templateId] ?? "memory_and_spawn";
  const taskId = body.taskId?.trim() || createTaskId();
  setCurrentTaskId(taskId);
  const subTenant = memorySubTenantForCreate(template, agentName);
  const origin = req.headers.get("origin") ?? undefined;
  const modelId = resolveModelId();

  const memoryParts: string[] = [
    `[create-agent] name="${agentName}" template=${templateId}`,
    `[user-query] ${userQuery}`,
  ];

  let searchProvider: string | undefined;

  if (action === "web_search") {
    const search = await runWebSearch(userQuery);
    searchProvider = search.provider;
    memoryParts.push(formatSearchForMemory(search));
    if (!search.ok) {
      memoryParts.push(`[search-warning] ${search.error ?? "no hits"}`);
    }
  } else if (action === "llm_brief") {
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { ok: false, error: GEMINI_KEY_FAULT, needsGemini: true },
        { status: 503 }
      );
    }
    const chunks: string[] = [];
    for await (const chunk of streamChatContent({
      modelId,
      system: template.systemPrompt,
      prompt: `${userQuery}\n\nRespond in under 6 lines with your role prefix. Persist-ready summary only.`,
    })) {
      chunks.push(chunk);
    }
    memoryParts.push(`[llm-brief] ${chunks.join("").slice(0, 1200)}`);
  }

  const memoryText = memoryParts.join("\n\n");
  const memResult = await writeAgentMemory(templateId, memoryText, {
    task_id: taskId,
    agent_name: agentName,
    create_flow: true,
    user_query: userQuery,
    sub_tenant_override: subTenant,
    search_provider: searchProvider,
  });

  if (!memResult.ok) {
    return NextResponse.json(
      { ok: false, error: memResult.error ?? "memory write failed", taskId },
      { status: 502 }
    );
  }

  void writeUserInteraction(
    `create agent ${agentName} (${templateId})`,
    memoryText.slice(0, 400),
    taskId
  );

  const output: string[] = [];
  const spawnResult = await spawnAgentTemplate({
    templateId,
    modelId,
    taskId,
    origin: origin ?? absoluteApiUrl("", process.env.NEXT_PUBLIC_APP_URL),
    command: `spawn agent ${templateId}`,
    write: (chunk) => {
      if (chunk) output.push(chunk);
    },
  });

  return NextResponse.json({
    ok: spawnResult.ok,
    taskId,
    templateId,
    agentName,
    subTenantId: subTenant,
    memoryId: memResult.memoryId,
    action,
    searchProvider,
    spawn: {
      ok: spawnResult.ok,
      message: spawnResult.message,
      output: output.join(""),
      needsLlm: agentNeedsLlm(templateId, "spawn"),
    },
  });
}
