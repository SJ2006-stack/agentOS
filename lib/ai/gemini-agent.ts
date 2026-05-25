import "server-only";
import { z } from "zod";
import { emitUsageFeedback } from "@/lib/ai/usage-feedback";
import { GEMINI_KEY_FAULT } from "@/lib/ai/faults";
import type { LlmUsage } from "@/lib/ai/llm-types";
import { isGeminiConfigured, resolveModelId } from "@/lib/ai/model";
import { getGeminiApiKey } from "@/lib/config/env";

export type GeminiUsageHandler = (usage: LlmUsage) => void | Promise<void>;

export type AgentToolDef<T extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  description: string;
  inputSchema: T;
  execute: (args: z.infer<T>) => Promise<unknown>;
};

export function defineTool<T extends z.ZodTypeAny>(
  def: AgentToolDef<T>
): AgentToolDef<T> {
  return def;
}

const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type GeminiFunctionDeclaration = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

type GeminiGenerateRequest = {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
  tools?: Array<{ functionDeclarations: GeminiFunctionDeclaration[] }>;
  generationConfig?: { maxOutputTokens?: number };
};

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
  usageMetadata?: GeminiUsageMetadata;
  error?: { message?: string; code?: number; status?: string };
};

function usageFromMetadata(meta?: GeminiUsageMetadata): LlmUsage | undefined {
  if (!meta) return undefined;
  const prompt = meta.promptTokenCount ?? 0;
  const completion = meta.candidatesTokenCount ?? 0;
  const total = meta.totalTokenCount ?? prompt + completion;
  if (prompt === 0 && completion === 0 && total === 0) return undefined;
  return { promptTokens: prompt, completionTokens: completion, totalTokens: total };
}

function geminiUrl(action: "generateContent" | "streamGenerateContent"): string {
  const model = resolveModelId();
  void model;
  return `${GEMINI_API_BASE}/${GEMINI_MODEL}:${action}`;
}

async function geminiRequest(
  action: "generateContent" | "streamGenerateContent",
  body: GeminiGenerateRequest,
  stream: boolean
): Promise<Response> {
  const key = getGeminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY missing");

  const url = stream
    ? `${geminiUrl(action)}?alt=sse`
    : geminiUrl(action);

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": key,
    },
    body: JSON.stringify(body),
  });
}

function parseGeminiErrorBody(body?: string): { message?: string; code?: number } {
  if (!body) return {};
  try {
    const j = JSON.parse(body) as GeminiGenerateResponse & {
      error?: { message?: string; code?: number };
    };
    const err = j.error;
    return { message: err?.message, code: err?.code };
  } catch {
    return {};
  }
}

/** Turn API / network errors into xterm-visible [fault] lines. */
export function geminiFault(err: unknown): string {
  if (err == null) return "[fault] Gemini request failed\n";
  if (typeof err === "object" && err !== null) {
    const e = err as {
      message?: string;
      status?: number;
      statusCode?: number;
      body?: string;
    };
    const parsed = parseGeminiErrorBody(
      typeof e.body === "string" ? e.body : undefined
    );
    const msg = parsed.message ?? e.message;
    const code = e.status ?? e.statusCode ?? parsed.code;

    if (msg) {
      const lines = [
        code ? `[fault] Gemini ${code}: ${msg}` : `[fault] ${msg}`,
      ];
      if (code === 429) {
        lines.push(
          "[fault] Rate limited — retry shortly or check Google AI Studio quotas"
        );
      } else if (code === 401 || code === 403) {
        lines.push(
          "[fault] Check GEMINI_API_KEY in .env.local: https://aistudio.google.com/apikey"
        );
      }
      return lines.join("\n") + "\n";
    }
  }
  return `[fault] ${err instanceof Error ? err.message : String(err)}\n`;
}

function toolToDeclaration(tool: AgentToolDef): GeminiFunctionDeclaration {
  const parameters = z.toJSONSchema(tool.inputSchema) as Record<string, unknown>;
  return {
    name: tool.name,
    description: tool.description,
    parameters,
  };
}

function partText(parts: GeminiPart[] | undefined): string {
  if (!parts?.length) return "";
  return parts
    .map((p) => ("text" in p && p.text ? p.text : ""))
    .filter(Boolean)
    .join("");
}

function partFunctionCalls(
  parts: GeminiPart[] | undefined
): Array<{ name: string; args: Record<string, unknown> }> {
  if (!parts?.length) return [];
  return parts
    .filter((p): p is { functionCall: { name: string; args: Record<string, unknown> } } =>
      "functionCall" in p && !!p.functionCall
    )
    .map((p) => ({
      name: p.functionCall.name,
      args: p.functionCall.args ?? {},
    }));
}

async function callGemini(
  body: GeminiGenerateRequest
): Promise<{ text: string; functionCalls: Array<{ name: string; args: Record<string, unknown> }>; usage?: LlmUsage }> {
  const res = await geminiRequest("generateContent", body, false);
  const raw = await res.text();
  if (!res.ok) {
    const parsed = parseGeminiErrorBody(raw);
    const err = new Error(parsed.message ?? `Gemini HTTP ${res.status}`) as Error & {
      statusCode?: number;
      body?: string;
    };
    err.statusCode = res.status;
    err.body = raw;
    throw err;
  }

  let data: GeminiGenerateResponse;
  try {
    data = JSON.parse(raw) as GeminiGenerateResponse;
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  if (data.error?.message) {
    const err = new Error(data.error.message) as Error & { statusCode?: number };
    err.statusCode = data.error.code;
    throw err;
  }

  const parts = data.candidates?.[0]?.content?.parts;
  return {
    text: partText(parts),
    functionCalls: partFunctionCalls(parts),
    usage: usageFromMetadata(data.usageMetadata),
  };
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
        controller.enqueue(encoder.encode(geminiFault(err)));
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

/** Wrap token stream as plain-text HTTP response for xterm. */
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
        controller.enqueue(encoder.encode(geminiFault(err)));
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

/** Stream assistant text via Gemini streamGenerateContent (SSE). */
export async function* streamChatContent(input: {
  modelId: string;
  system: string;
  prompt: string;
  messages?: Array<{ role: "user" | "model"; text: string }>;
  onUsage?: GeminiUsageHandler;
}): AsyncGenerator<string> {
  if (!isGeminiConfigured()) {
    yield GEMINI_KEY_FAULT;
    return;
  }

  try {
    void input.modelId;
    const contents: GeminiContent[] =
      input.messages?.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })) ?? [{ role: "user", parts: [{ text: input.prompt }] }];

    const body: GeminiGenerateRequest = {
      systemInstruction: { parts: [{ text: input.system }] },
      contents,
    };

    const res = await geminiRequest("streamGenerateContent", body, true);
    if (!res.ok) {
      const raw = await res.text();
      const parsed = parseGeminiErrorBody(raw);
      const err = new Error(parsed.message ?? `Gemini HTTP ${res.status}`) as Error & {
        statusCode?: number;
        body?: string;
      };
      err.statusCode = res.status;
      err.body = raw;
      throw err;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const fallback = await callGemini(body);
      if (fallback.text) yield fallback.text;
      else yield "[fault] Gemini returned an empty stream\n";
      if (fallback.usage) {
        if (input.onUsage) await input.onUsage(fallback.usage);
        else await emitUsageFeedback(fallback.usage);
      }
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let yielded = false;
    let lastUsage: LlmUsage | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload) as GeminiGenerateResponse;
          if (chunk.usageMetadata) lastUsage = usageFromMetadata(chunk.usageMetadata);
          const text = partText(chunk.candidates?.[0]?.content?.parts);
          if (text) {
            yielded = true;
            yield text;
          }
        } catch {
          /* skip malformed SSE lines */
        }
      }
    }

    if (lastUsage) {
      if (input.onUsage) await input.onUsage(lastUsage);
      else await emitUsageFeedback(lastUsage);
    }
    if (!yielded) {
      yield "[fault] Gemini returned an empty stream\n";
    }
  } catch (err) {
    yield geminiFault(err);
  }
}

export type RunChatWithToolsResult = {
  text: string;
  usage?: LlmUsage;
};

/**
 * Multi-step agent loop using Gemini generateContent + function calling.
 */
export async function runChatWithTools(input: {
  modelId: string;
  system: string;
  prompt: string;
  tools: AgentToolDef[];
  maxSteps?: number;
  maxTokens?: number;
  onUsage?: GeminiUsageHandler;
}): Promise<RunChatWithToolsResult> {
  if (!isGeminiConfigured()) {
    throw new Error(
      "GEMINI_API_KEY missing — set GEMINI_API_KEY in .env.local and restart npm run dev"
    );
  }

  void input.modelId;
  const toolDefs = input.tools;
  const byName = Object.fromEntries(toolDefs.map((t) => [t.name, t]));
  const declarations = toolDefs.map(toolToDeclaration);

  const contents: GeminiContent[] = [
    { role: "user", parts: [{ text: input.prompt }] },
  ];

  let finalText = "";
  let lastUsage: LlmUsage | undefined;

  try {
    for (let step = 0; step < (input.maxSteps ?? 6); step++) {
      const body: GeminiGenerateRequest = {
        systemInstruction: { parts: [{ text: input.system }] },
        contents,
        ...(declarations.length
          ? { tools: [{ functionDeclarations: declarations }] }
          : {}),
        ...(input.maxTokens ? { generationConfig: { maxOutputTokens: input.maxTokens } } : {}),
      };

      const result = await callGemini(body);
      if (result.usage) lastUsage = result.usage;
      finalText = result.text;

      if (!result.functionCalls.length) break;

      contents.push({
        role: "model",
        parts: result.functionCalls.map((fc) => ({
          functionCall: { name: fc.name, args: fc.args },
        })),
      });

      const responseParts: GeminiPart[] = [];
      for (const fc of result.functionCalls) {
        const def = byName[fc.name];
        let output: unknown = { error: `unknown tool: ${fc.name}` };
        if (def) {
          const parsed = def.inputSchema.safeParse(fc.args);
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
        responseParts.push({
          functionResponse: {
            name: fc.name,
            response:
              typeof output === "object" && output !== null
                ? (output as Record<string, unknown>)
                : { result: output },
          },
        });
      }

      contents.push({ role: "user", parts: responseParts });
    }

    if (lastUsage) {
      if (input.onUsage) await input.onUsage(lastUsage);
      else await emitUsageFeedback(lastUsage);
    }

    return { text: finalText, usage: lastUsage };
  } catch (err) {
    throw new Error(geminiFault(err).replace(/^\[fault\]\s*/, "").trim());
  }
}

/** Stream tool-loop progress and final assistant text. */
export async function* streamChatWithTools(input: {
  modelId: string;
  system: string;
  prompt: string;
  tools: AgentToolDef[];
  maxSteps?: number;
  maxTokens?: number;
  onUsage?: GeminiUsageHandler;
}): AsyncGenerator<string> {
  if (!isGeminiConfigured()) {
    yield GEMINI_KEY_FAULT;
    return;
  }

  try {
    void input.modelId;
    const toolDefs = input.tools;
    const byName = Object.fromEntries(toolDefs.map((t) => [t.name, t]));
    const declarations = toolDefs.map(toolToDeclaration);
    const maxSteps = input.maxSteps ?? 6;

    const contents: GeminiContent[] = [
      { role: "user", parts: [{ text: input.prompt }] },
    ];

    let finalText = "";
    let lastUsage: LlmUsage | undefined;

    for (let step = 0; step < maxSteps; step++) {
      const body: GeminiGenerateRequest = {
        systemInstruction: { parts: [{ text: input.system }] },
        contents,
        ...(declarations.length
          ? { tools: [{ functionDeclarations: declarations }] }
          : {}),
        ...(input.maxTokens ? { generationConfig: { maxOutputTokens: input.maxTokens } } : {}),
      };

      const result = await callGemini(body);
      if (result.usage) lastUsage = result.usage;
      finalText = result.text;

      if (!result.functionCalls.length) break;

      const names = result.functionCalls.map((fc) => fc.name).join(", ");
      yield `[kernel] tools: ${names}…\n`;

      contents.push({
        role: "model",
        parts: result.functionCalls.map((fc) => ({
          functionCall: { name: fc.name, args: fc.args },
        })),
      });

      const responseParts: GeminiPart[] = [];
      for (const fc of result.functionCalls) {
        const def = byName[fc.name];
        let output: unknown = { error: `unknown tool: ${fc.name}` };
        if (def) {
          const parsed = def.inputSchema.safeParse(fc.args);
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
        responseParts.push({
          functionResponse: {
            name: fc.name,
            response:
              typeof output === "object" && output !== null
                ? (output as Record<string, unknown>)
                : { result: output },
          },
        });
      }

      contents.push({ role: "user", parts: responseParts });
    }

    if (lastUsage) {
      if (input.onUsage) await input.onUsage(lastUsage);
      else await emitUsageFeedback(lastUsage);
    }

    if (finalText) {
      yield finalText.endsWith("\n") ? finalText : `${finalText}\n`;
    } else {
      yield "[fault] Gemini returned empty assistant text\n";
    }
  } catch (err) {
    yield geminiFault(err);
  }
}
