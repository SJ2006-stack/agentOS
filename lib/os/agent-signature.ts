/** Agent color signatures for mission-control / desktop UI. */
export type AgentSignature = "research" | "security" | "code" | "default";

export function resolveAgentSignature(
  templateId: string,
  role?: string
): AgentSignature {
  const hay = `${templateId} ${role ?? ""}`.toLowerCase();
  if (hay.includes("research")) return "research";
  if (hay.includes("security")) return "security";
  if (
    hay.includes("code") ||
    hay.includes("dev") ||
    hay.includes("cpu.") ||
    hay.includes("gpu.")
  ) {
    return "code";
  }
  return "default";
}

const SIGNATURE_CLASSES: Record<AgentSignature, string> = {
  research: "text-sky-400 border-sky-400/50 bg-sky-500/10",
  security: "text-red-400 border-red-400/50 bg-red-500/10",
  code: "text-emerald-400 border-emerald-400/50 bg-emerald-500/10",
  default: "text-os-green border-os-border/80 bg-os-panel/50",
};

const SIGNATURE_STROKE: Record<AgentSignature, string> = {
  research: "#38bdf8",
  security: "#f87171",
  code: "#34d399",
  default: "var(--os-green)",
};

export function signatureClass(sig: AgentSignature): string {
  return SIGNATURE_CLASSES[sig];
}

export function signatureStroke(sig: AgentSignature): string {
  return SIGNATURE_STROKE[sig];
}
