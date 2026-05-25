import { streamText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { KERNEL_SYSTEM, MODEL_ID } from "@/lib/ai/agents";
import { createKernelTools } from "@/lib/ai/kernel-tools";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { prompt, taskId } = (await req.json()) as {
    prompt: string;
    taskId?: string;
  };

  const result = streamText({
    model: openai(MODEL_ID),
    system: KERNEL_SYSTEM,
    prompt,
    tools: createKernelTools({ taskId }),
    stopWhen: stepCountIs(6),
  });

  return result.toTextStreamResponse();
}
