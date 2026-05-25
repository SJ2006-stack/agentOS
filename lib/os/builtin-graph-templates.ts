import type { GraphTemplate } from "@/lib/os/agent-graph-layout";

/** Client-safe builtin templates — avoids /api/agents/registry on first paint. */
export const BUILTIN_GRAPH_TEMPLATES: GraphTemplate[] = [
  { id: "user.session", role: "user.session", custom: false },
  { id: "kernel.orchestrator", role: "kernel.orchestrator", custom: false },
  { id: "cpu.intake", role: "cpu.intake", custom: false },
  { id: "cpu.plan", role: "cpu.plan", custom: false },
  { id: "cpu.route", role: "cpu.route", custom: false },
  { id: "cpu.dispatch", role: "cpu.dispatch", custom: false },
  { id: "cpu.verify", role: "cpu.verify", custom: false },
  { id: "cpu.commit", role: "cpu.commit", custom: false },
  { id: "gpu.worker", role: "gpu.worker", custom: false },
  { id: "io.bus", role: "io.bus", custom: false },
  { id: "hydradb.memory", role: "hydradb.hub", custom: false },
];

/** Lightweight edge list for hero/landing graph visuals (no LLM prompts). */
export const BUILTIN_GRAPH_EDGES: Record<string, string[]> = {
  "user.session": ["kernel.orchestrator", "hydradb.memory"],
  "kernel.orchestrator": ["cpu.intake", "hydradb.memory"],
  "cpu.intake": ["cpu.plan", "hydradb.memory"],
  "cpu.plan": ["cpu.route", "hydradb.memory"],
  "cpu.route": ["cpu.dispatch", "hydradb.memory"],
  "cpu.dispatch": ["gpu.worker", "cpu.verify", "hydradb.memory"],
  "cpu.verify": ["cpu.commit", "hydradb.memory"],
  "cpu.commit": ["hydradb.memory"],
  "gpu.worker": ["hydradb.memory"],
  "io.bus": ["hydradb.memory"],
  "hydradb.memory": [],
};
