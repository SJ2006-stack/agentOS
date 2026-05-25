import { streamText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { CPU_SYSTEM, cpuStepPrompt, MODEL_ID } from "@/lib/ai/agents";
import { createOsTools } from "@/lib/ai/tools";
import { runCpuPipeline } from "@/lib/ai/run-cpu";
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
  };

  if (!process.env.OPENAI_API_KEY) {
    return new Response("[fault] OPENAI_API_KEY not configured\n", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const task = body.task ?? "idle task";
  const taskId = body.taskId ?? `t-${Date.now().toString(36)}`;
  const origin = new URL(req.url).origin;

  if (body.runFullPipeline) {
    void runCpuPipeline(taskId, task, origin).catch(console.error);
    return new Response(
      `[cpu] pipeline started taskId=${taskId}\n`,
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const step = body.step ?? CPU_STEPS[0];
  const result = streamText({
    model: openai(MODEL_ID),
    system: CPU_SYSTEM,
    prompt: cpuStepPrompt(step, task, taskId),
    tools: createOsTools({ taskId, step, origin }),
    stopWhen: stepCountIs(5),
  });

  if (body.stream) {
    return result.toTextStreamResponse();
  }

  const text = await result.text;
  return new Response(`[cpu] ${step}: ${text}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
