export const dynamic = "force-dynamic";

import { CPU_SYSTEM, cpuStepPrompt } from "@/lib/ai/agents";
import { isAgentLlmConfigured, resolveModelId } from "@/lib/ai/model";
import {
  runChatWithTools,
  streamChatWithTools,
  textStreamResponse,
} from "@/lib/ai/openrouter-agent";
import { runCpuPipeline } from "@/lib/ai/run-cpu";
import { createOsTools } from "@/lib/ai/tools";
import type { CpuStep } from "@/lib/os/types";
import { CPU_STEPS } from "@/lib/os/types";

export const maxDuration = 120;


export async function POST(req: Request) {
  const body = (await req.json()) as {
    task?: string;
    taskId?: string;
    step?: CpuStep;
    runFullPipeline?: boolean;
    stream?: boolean;
    modelId?: string;
  };

  if (!isAgentLlmConfigured()) {
    return new Response(
      "[fault] OPENROUTER_API_KEY missing — set OPENROUTER_API_KEY in .env.local and restart npm run dev\n",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const task = body.task ?? "idle task";
  const taskId = body.taskId ?? `t-${Date.now().toString(36)}`;
  const model = resolveModelId(body.modelId);
  const origin = new URL(req.url).origin;

  if (body.runFullPipeline) {
    void runCpuPipeline(taskId, task, origin, model).catch(console.error);
    return new Response(
      `[cpu] pipeline started taskId=${taskId} model=${model}\n`,
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const step = body.step ?? CPU_STEPS[0];
  const tools = createOsTools({ taskId, step, origin, modelId: model });

  if (body.stream) {
    return textStreamResponse(
      "",
      streamChatWithTools({
        modelId: model,
        system: CPU_SYSTEM,
        prompt: cpuStepPrompt(step, task, taskId),
        tools,
        maxSteps: 5,
      })
    );
  }

  const { text } = await runChatWithTools({
    modelId: model,
    system: CPU_SYSTEM,
    prompt: cpuStepPrompt(step, task, taskId),
    tools,
    maxSteps: 5,
  });

  return new Response(`[cpu] ${step}: ${text}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
