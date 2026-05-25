export interface GraphTemplate {
  id: string;
  role: string;
  custom: boolean;
}

export const AGENT_GRAPH_LAYOUT: Record<string, { x: number; y: number }> = {
  "user.session": { x: 6, y: 6 },
  "kernel.orchestrator": { x: 6, y: 28 },
  "cpu.intake": { x: 54, y: 6 },
  "cpu.plan": { x: 78, y: 6 },
  "cpu.route": { x: 102, y: 6 },
  "cpu.dispatch": { x: 126, y: 6 },
  "cpu.verify": { x: 150, y: 6 },
  "cpu.commit": { x: 174, y: 6 },
  "gpu.worker": { x: 126, y: 34 },
  "io.bus": { x: 54, y: 34 },
  "hydradb.memory": { x: 6, y: 52 },
};
