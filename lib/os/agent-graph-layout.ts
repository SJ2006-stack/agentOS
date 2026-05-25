export interface GraphTemplate {
  id: string;
  role: string;
  custom: boolean;
}

export const AGENT_GRAPH_LAYOUT: Record<string, { x: number; y: number }> = {
  "user.session": { x: 6, y: 6 },
  "kernel.orchestrator": { x: 6, y: 26 },
  "cpu.intake": { x: 54, y: 6 },
  "cpu.plan": { x: 88, y: 6 },
  "cpu.route": { x: 122, y: 6 },
  "cpu.dispatch": { x: 156, y: 6 },
  "cpu.verify": { x: 190, y: 6 },
  "cpu.commit": { x: 224, y: 6 },
  "gpu.worker": { x: 156, y: 30 },
  "io.bus": { x: 54, y: 30 },
  "hydradb.memory": { x: 6, y: 48 },
};
