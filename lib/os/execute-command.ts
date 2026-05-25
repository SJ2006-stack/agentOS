import { withBasePath } from "@/lib/api/url";
import { dispatchAgentSpawned } from "@/lib/os/shell-events";
import { useOsStore } from "@/store/os/osStore";

const SPAWN_STREAM_RE = /\[agent\] spawning (\S+)/;
const SPAWN_KERNEL_RE = /\[kernel\] spawn (\S+)/;

function parseSpawnTemplateId(chunk: string): string | null {
  for (const line of chunk.split("\n")) {
    const trimmed = line.trim();
    const agent = trimmed.match(SPAWN_STREAM_RE);
    if (agent) return agent[1]!;
    const kernel = trimmed.match(SPAWN_KERNEL_RE);
    if (kernel) return kernel[1]!.replace(/…$/, "");
  }
  return null;
}

function maybeEmitSpawnFromChunk(chunk: string): void {
  const templateId = parseSpawnTemplateId(chunk);
  if (templateId) dispatchAgentSpawned({ templateId });
}

/**
 * Runs a kernel command via the OS API without mounting xterm.
 * Used from workspace mode so spawn/demo stay on the orchestration UI.
 */
export async function executeOsCommand(command: string): Promise<void> {
  if (typeof window === "undefined") return;
  const trimmed = command.trim();
  if (!trimmed) return;

  useOsStore.getState().setKernelCommand(trimmed);
  const modelId = useOsStore.getState().selectedModelId;

  const res = await fetch(withBasePath("/api/os/command"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: trimmed, modelId }),
    cache: "no-store",
  });

  if (!res.ok) return;

  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    if (text) maybeEmitSpawnFromChunk(text);
    return;
  }

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.length) {
      maybeEmitSpawnFromChunk(decoder.decode(value, { stream: true }));
    }
  }
  maybeEmitSpawnFromChunk(decoder.decode());
}
