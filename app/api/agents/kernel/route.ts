export const dynamic = "force-dynamic";

import { KERNEL_SYSTEM } from "@/lib/ai/agents";
import { createKernelTools } from "@/lib/ai/kernel-tools";
import { isGeminiConfigured, resolveModelId } from "@/lib/ai/model";
import {
  streamChatWithTools,
  textStreamResponse,
} from "@/lib/ai/gemini-agent";

export const maxDuration = 60;


export async function POST(req: Request) {
  if (!isGeminiConfigured()) {
    return new Response(
      "[fault] GEMINI_API_KEY missing — set GEMINI_API_KEY in .env.local and restart npm run dev\n",
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
