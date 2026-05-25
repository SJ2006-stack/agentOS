export interface GraphTemplate {
  id: string;
  role: string;
  custom: boolean;
}

export const AGENT_GRAPH_LAYOUT: Record<string, { x: number; y: number }> = {
  "user.session": { x: 8, y: 4 },
  "kernel.orchestrator": { x: 28, y: 18 },
  "cpu.intake": { x: 52, y: 8 },
  "cpu.plan": { x: 68, y: 8 },
  "cpu.route": { x: 84, y: 8 },
  "cpu.dispatch": { x: 100, y: 8 },
  "cpu.verify": { x: 116, y: 8 },
  "cpu.commit": { x: 132, y: 8 },
  "gpu.worker": { x: 100, y: 36 },
  "io.bus": { x: 52, y: 36 },
  "hydradb.memory": { x: 28, y: 48 },
};
