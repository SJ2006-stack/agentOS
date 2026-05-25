import "server-only";
import type {
  ChatFunctionTool,
  ChatMessages,
  ChatStreamChunk,
  ChatUsage,
} from "@openrouter/sdk/models";
import { z } from "zod";
import { emitUsageFeedback } from "@/lib/ai/usage-feedback";
import { OPENROUTER_KEY_FAULT } from "@/lib/ai/faults";
import { getOpenRouter, isOpenRouterConfigured, resolveModelId } from "@/lib/ai/model";

export type OpenRouterUsageHandler = (usage: ChatUsage) => void | Promise<void>;

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

/** Turn SDK / network errors into xterm-visible [fault] lines. */
export function openRouterFault(err: unknown): string {
  if (err == null) return "[fault] OpenRouter request failed\n";
  if (typeof err === "object" && err !== null) {
    const e = err as {
      message?: string;
      statusCode?: number;
      body?: string;
      error?: { message?: string; code?: number };
      data$?: { error?: { message?: string } };
    };
    const nested =
      e.error?.message ??
      e.data$?.error?.message ??
      (typeof e.body === "string"
        ? (() => {
            try {
              const j = JSON.parse(e.body) as { error?: { message?: string } };
              return j.error?.message;
            } catch {
              return undefined;
            }
          })()
        : undefined);
    const msg = nested ?? e.message;
    if (msg) {
      const code = e.statusCode ?? e.error?.code;
      return code
        ? `[fault] OpenRouter ${code}: ${msg}\n`
        : `[fault] ${msg}\n`;
    }
  }
  return `[fault] ${err instanceof Error ? err.message : String(err)}\n`;
}

function formatMessageContent(
  content: string | Array<{ type?: string; text?: string }> | null | undefined
): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part && typeof part === "object" && "text" in part && part.text
          ? String(part.text)
          : ""
      )
      .join("");
  }
  return String(content);
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
  if (Array.isArray(delta.content)) {
    return formatMessageContent(delta.content);
  }
  if (typeof delta.reasoning === "string" && delta.reasoning) {
    return delta.reasoning;
  }
  return "";
}

/** Stream preamble then incremental chunks (e.g. CPU pipeline progress). */
export function incrementalStreamResponse(
  preamble: string,
  run: (write: (chunk: string) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (preamble) controller.enqueue(encoder.encode(preamble));
        await run((chunk) => {
          if (chunk) controller.enqueue(encoder.encode(chunk));
        });
      } catch (err) {
        controller.enqueue(encoder.encode(openRouterFault(err)));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

/** Wrap SDK token stream as plain-text HTTP response for xterm. */
export function textStreamResponse(
  preamble: string,
  textSource: AsyncIterable<string>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (preamble) controller.enqueue(encoder.encode(preamble));
        for await (const chunk of textSource) {
          if (chunk) controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        controller.enqueue(encoder.encode(openRouterFault(err)));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

/** Stream assistant text deltas via @openrouter/sdk (no tool loop). */
export async function* streamChatContent(input: {
  modelId: string;
  system: string;
  prompt: string;
  messages?: ChatMessages[];
  onUsage?: OpenRouterUsageHandler;
}): AsyncGenerator<string> {
  if (!isOpenRouterConfigured()) {
    yield OPENROUTER_KEY_FAULT;
    return;
  }
  try {
    const openrouter = getOpenRouter();
    const model = resolveModelId(input.modelId);
    const messages: ChatMessages[] = input.messages ?? [
      { role: "system", content: input.system },
      { role: "user", content: input.prompt },
    ];

    // SDK v0.12.x requires chatRequest wrapper; model is always openrouter/free.
    const stream = await openrouter.chat.send({
      chatRequest: { model, messages, stream: true },
    });

    let yielded = false;
    let lastUsage: ChatUsage | undefined;
    for await (const chunk of stream) {
      if (chunk.usage) lastUsage = chunk.usage;
      const text = chunkText(chunk);
      if (text) {
        yielded = true;
        yield text;
      }
    }
    if (lastUsage) {
      if (input.onUsage) await input.onUsage(lastUsage);
      else await emitUsageFeedback(lastUsage);
    }
    if (!yielded) {
      yield "[fault] OpenRouter returned an empty stream\n";
    }
  } catch (err) {
    yield openRouterFault(err);
  }
}

/**
 * Multi-step agent loop using OpenRouter chat completions + native tools.
 * Primary path for kernel/CPU agents (replaces Vercel AI SDK streamText + tools).
 */
export type RunChatWithToolsResult = {
  text: string;
  usage?: ChatUsage;
};

export async function runChatWithTools(input: {
  modelId: string;
  system: string;
  prompt: string;
  tools: OpenRouterToolDef[];
  maxSteps?: number;
  maxTokens?: number;
  onUsage?: OpenRouterUsageHandler;
}): Promise<RunChatWithToolsResult> {
  if (!isOpenRouterConfigured()) {
    throw new Error(
      "OPENROUTER_API_KEY missing — set OPENROUTER_API_KEY in .env.local and restart npm run dev"
    );
  }

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
  let lastUsage: ChatUsage | undefined;

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

    if (result.usage) lastUsage = result.usage;

    const choice = result.choices[0];
    const msg = choice?.message;
    if (!msg) break;

    const content = formatMessageContent(
      msg.content as string | Array<{ type?: string; text?: string }> | null
    );
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
          try {
            output = await def.execute(parsed.data);
          } catch (toolErr) {
            output = {
              error:
                toolErr instanceof Error ? toolErr.message : "tool execution failed",
            };
          }
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

  if (lastUsage) {
    if (input.onUsage) await input.onUsage(lastUsage);
    else await emitUsageFeedback(lastUsage);
  }

  return { text: finalText, usage: lastUsage };
}

/** Run tool loop, then yield final assistant text for streaming routes. */
export async function* streamChatWithTools(input: {
  modelId: string;
  system: string;
  prompt: string;
  tools: OpenRouterToolDef[];
  maxSteps?: number;
  onUsage?: OpenRouterUsageHandler;
}): AsyncGenerator<string> {
  if (!isOpenRouterConfigured()) {
    yield OPENROUTER_KEY_FAULT;
    return;
  }
  try {
    const { text } = await runChatWithTools(input);
    if (text) {
      yield text.endsWith("\n") ? text : `${text}\n`;
    } else {
      yield "[fault] OpenRouter returned empty assistant text\n";
    }
  } catch (err) {
    yield openRouterFault(err);
  }
}
