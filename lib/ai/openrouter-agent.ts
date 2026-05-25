import "server-only";
import type {
  ChatFunctionTool,
  ChatMessages,
  ChatStreamChunk,
} from "@openrouter/sdk/models";
import { z } from "zod";
import { getOpenRouter, resolveModelId } from "@/lib/ai/model";

export type OpenRouterToolDef<T extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  description: string;
  inputSchema: T;
  execute: (args: z.infer<T>) => Promise<unknown>;
};

export function defineTool<T extends z.ZodTypeAny>(
  def: OpenRouterToolDef<T>
): OpenRouterToolDef<T> {
  return def;
}

function toolToChatFunction(tool: OpenRouterToolDef): ChatFunctionTool {
  const parameters = z.toJSONSchema(tool.inputSchema) as {
    [k: string]: unknown;
  };
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters,
    },
  };
}

function chunkText(chunk: ChatStreamChunk): string {
  const delta = chunk.choices[0]?.delta;
  if (!delta) return "";
  if (typeof delta.content === "string") return delta.content;
  return "";
}

/** Wrap SDK token stream as plain-text HTTP response for xterm. */
export function textStreamResponse(
  preamble: string,
  textSource: AsyncIterable<string>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      if (preamble) controller.enqueue(encoder.encode(preamble));
      for await (const chunk of textSource) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** Stream assistant text deltas via @openrouter/sdk (no tool loop). */
export async function* streamChatContent(input: {
  modelId: string;
  system: string;
  prompt: string;
  messages?: ChatMessages[];
}): AsyncGenerator<string> {
  const openrouter = getOpenRouter();
  const model = resolveModelId(input.modelId);
  const messages: ChatMessages[] = input.messages ?? [
    { role: "system", content: input.system },
    { role: "user", content: input.prompt },
  ];

  const sdkStream = await openrouter.chat.send({
    chatRequest: { model, messages, stream: true },
  });

  for await (const chunk of sdkStream) {
    const text = chunkText(chunk);
    if (text) yield text;
  }
}

/**
 * Multi-step agent loop using OpenRouter chat completions + native tools.
 * Primary path for kernel/CPU agents (replaces Vercel AI SDK streamText + tools).
 */
export async function runChatWithTools(input: {
  modelId: string;
  system: string;
  prompt: string;
  tools: OpenRouterToolDef[];
  maxSteps?: number;
  maxTokens?: number;
}): Promise<string> {
  const openrouter = getOpenRouter();
  const model = resolveModelId(input.modelId);
  const toolDefs = input.tools;
  const toolList = toolDefs.map(toolToChatFunction);
  const byName = Object.fromEntries(toolDefs.map((t) => [t.name, t]));

  const messages: ChatMessages[] = [
    { role: "system", content: input.system },
    { role: "user", content: input.prompt },
  ];

  let finalText = "";

  for (let step = 0; step < (input.maxSteps ?? 6); step++) {
    const result = await openrouter.chat.send({
      chatRequest: {
        model,
        messages,
        tools: toolList.length ? toolList : undefined,
        stream: false,
        maxTokens: input.maxTokens,
      },
    });

    const choice = result.choices[0];
    const msg = choice?.message;
    if (!msg) break;

    const content =
      typeof msg.content === "string"
        ? msg.content
        : msg.content == null
          ? ""
          : JSON.stringify(msg.content);
    finalText = content;

    messages.push({
      role: "assistant",
      content: msg.content ?? null,
      toolCalls: msg.toolCalls,
    });

    const toolCalls = msg.toolCalls;
    if (!toolCalls?.length) break;

    for (const tc of toolCalls) {
      const name = tc.function.name;
      const def = byName[name];
      let args: unknown = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        args = {};
      }

      let output: unknown = { error: `unknown tool: ${name}` };
      if (def) {
        const parsed = def.inputSchema.safeParse(args);
        if (parsed.success) {
          output = await def.execute(parsed.data);
        } else {
          output = { error: parsed.error.message };
        }
      }

      messages.push({
        role: "tool",
        toolCallId: tc.id,
        content: JSON.stringify(output),
      });
    }
  }

  return finalText;
}

/** Run tool loop, then yield final assistant text for streaming routes. */
export async function* streamChatWithTools(input: {
  modelId: string;
  system: string;
  prompt: string;
  tools: OpenRouterToolDef[];
  maxSteps?: number;
}): AsyncGenerator<string> {
  const text = await runChatWithTools(input);
  if (text) yield text;
}
