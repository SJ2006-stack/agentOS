import { KERNEL_SYSTEM } from "@/lib/ai/agents";
import { createKernelTools } from "@/lib/ai/kernel-tools";
import { isOpenRouterConfigured, resolveModelId } from "@/lib/ai/model";
import {
  streamChatWithTools,
  textStreamResponse,
} from "@/lib/ai/openrouter-agent";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isOpenRouterConfigured()) {
    return new Response(
      "[fault] OPENROUTER_API_KEY not configured\n",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const { prompt, taskId, modelId } = (await req.json()) as {
    prompt: string;
    taskId?: string;
    modelId?: string;
  };

  const model = resolveModelId(modelId);

  return textStreamResponse(
    "",
    streamChatWithTools({
      modelId: model,
      system: KERNEL_SYSTEM,
      prompt,
      tools: createKernelTools({ taskId }),
      maxSteps: 6,
    })
  );
}
