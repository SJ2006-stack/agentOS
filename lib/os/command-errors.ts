export type CommandApiError = {
  message: string;
  status?: number;
  kind: "network" | "http" | "fault";
};

export function formatCommandFaultMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "[fault] command failed";
  if (trimmed.startsWith("[fault]")) return trimmed;
  return `[fault] ${trimmed}`;
}

export async function parseCommandApiError(
  res: Response | null,
  caught?: unknown
): Promise<CommandApiError> {
  if (!res) {
    return {
      message: formatCommandFaultMessage(
        caught instanceof Error ? caught.message : "network error — check connection"
      ),
      kind: "network",
    };
  }

  const status = res.status;
  const errText = await res.text().catch(() => "");
  const trimmed = errText.trim();

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { ok?: boolean; error?: string };
      if (parsed.error) {
        return {
          message: formatCommandFaultMessage(parsed.error),
          status,
          kind: "fault",
        };
      }
    } catch {
      /* fall through */
    }
  }

  const isHtml =
    trimmed.startsWith("<!") ||
    trimmed.toLowerCase().includes("<!doctype html");

  if (isHtml) {
    return {
      message: `[fault] API not found (${status}) — check basePath and dev server`,
      status,
      kind: "http",
    };
  }

  const line = trimmed ? trimmed.split("\n")[0]! : `[fault] HTTP ${status}`;
  return {
    message: line.startsWith("[fault]") ? line : formatCommandFaultMessage(line),
    status,
    kind: "http",
  };
}
