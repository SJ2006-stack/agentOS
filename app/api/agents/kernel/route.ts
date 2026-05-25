import { streamText, stepCountIs } from "ai";
import { KERNEL_SYSTEM } from "@/lib/ai/agents";
import { createKernelTools } from "@/lib/ai/kernel-tools";
import { getModel, isAiGatewayConfigured, resolveModelId } from "@/lib/ai/model";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isAiGatewayConfigured()) {
    return new Response(
      "[fault] AI_GATEWAY_API_KEY not configured\n",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const { prompt, taskId, modelId } = (await req.json()) as {
    prompt: string;
    taskId?: string;
    modelId?: string;
  };

  const model = resolveModelId(modelId);

  const result = streamText({
    model: getModel(model),
    system: KERNEL_SYSTEM,
    prompt,
    tools: createKernelTools({ taskId }),
    stopWhen: stepCountIs(6),
  });

  return result.toTextStreamResponse();
}
