"use client";

import { create } from "zustand";
import {
  DEFAULT_OPENROUTER_MODEL_ID,
  isOpenRouterModelId,
} from "@/lib/ai/models-client";
import {
  CPU_STEPS,
  type CpuPipelineState,
  type CpuStep,
  type GpuDispatchPayload,
  type GraphNodeActiveEvent,
  type IoToolCall,
  type KernelHeartbeat,
  type KernelUsageTick,
  type MemoryRecallResult,
  type MemorySlotWrite,
  emptyHeatmap,
} from "@/lib/os/types";

/** Coalesced realtime deltas — flushed in one zustand set(). */
export type RealtimeBatch = {
  kernelHeartbeat?: KernelHeartbeat;
  kernelCommand?: string;
  kernelUsage?: KernelUsageTick;
  kernelConnected?: boolean;
  cpuStep?: { step: CpuStep; status: "start" | "complete" | "running"; message?: string };
  cpuPipeline?: Partial<CpuPipelineState>;
  memorySlots?: MemorySlotWrite[];
  memoryRecall?: MemoryRecallResult;
  ioEvents?: IoToolCall[];
  gpuDispatch?: GpuDispatchPayload;
  gpuHeatUpdates?: { x: number; y: number; heat: number }[];
  gpuWorkers?: number;
  graphNodeActive?: GraphNodeActiveEvent[];
};

interface OsState {
  bootComplete: boolean;
  heroBootEnabled: boolean;
  kernel: {
    heartbeat: KernelHeartbeat | null;
    lastCommand: string | null;
    lastUsage: KernelUsageTick | null;
    connected: boolean;
  };
  cpu: {
    pipeline: CpuPipelineState;
    lastMessage: string | null;
  };
  memory: {
    slots: MemorySlotWrite[];
    lastRecall: MemoryRecallResult | null;
    connected: boolean;
  };
  io: {
    events: IoToolCall[];
  };
  gpu: {
    heatmap: number[][];
    activeWorkers: number;
    lastDispatch: GpuDispatchPayload | null;
    /** Increments on each os:gpu dispatch — drives heatmap enter animation. */
    dispatchSeq: number;
  };
  graph: {
    activeNodeIds: Set<string>;
    taskId: string | null;
  };
  hydraConfigured: boolean;
  supabaseConfigured: boolean;
  selectedModelId: string;

  applyRealtimeBatch: (batch: RealtimeBatch) => void;
  setKernelHeartbeat: (h: KernelHeartbeat) => void;
  setKernelCommand: (cmd: string) => void;
  setKernelUsage: (u: KernelUsageTick) => void;
  setKernelConnected: (v: boolean) => void;
  setCpuStep: (step: CpuStep, status: "start" | "complete" | "running", msg?: string) => void;
  setCpuPipeline: (p: Partial<CpuPipelineState>) => void;
  addMemorySlot: (slot: MemorySlotWrite) => void;
  setMemoryRecall: (r: MemoryRecallResult) => void;
  setMemoryConnected: (v: boolean) => void;
  pushIoEvent: (e: IoToolCall) => void;
  setGpuDispatch: (d: GpuDispatchPayload) => void;
  updateGpuHeat: (x: number, y: number, heat: number) => void;
  setGpuWorkers: (n: number) => void;
  setGraphNodeActive: (event: GraphNodeActiveEvent) => void;
  setConfigFlags: (hydra: boolean, supabase: boolean) => void;
  setSelectedModelId: (id: string) => void;
  hydrateModelFromStorage: () => void;
  resetGpuHeat: () => void;
  setBootComplete: (v: boolean) => void;
  setHeroBootEnabled: (v: boolean) => void;
  hydrateHeroBootFromStorage: () => void;
}

const MODEL_STORAGE_KEY = "devfactory-os-model";
const HERO_BOOT_STORAGE_KEY = "agentos-hero-boot";

function readHeroBootEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(HERO_BOOT_STORAGE_KEY);
    if (stored === "0" || stored === "false") return false;
  } catch {
    /* ignore */
  }
  return true;
}

function persistHeroBootEnabled(v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HERO_BOOT_STORAGE_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function readStoredModelId(): string {
  if (typeof window === "undefined") return DEFAULT_OPENROUTER_MODEL_ID;
  try {
    const stored = localStorage.getItem(MODEL_STORAGE_KEY);
    if (stored && isOpenRouterModelId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_OPENROUTER_MODEL_ID;
}

function persistModelId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

const initialPipeline: CpuPipelineState = {
  currentStep: null,
  taskId: null,
  completedSteps: [],
};

export const useOsStore = create<OsState>((set) => ({
  bootComplete: typeof window !== "undefined" ? !readHeroBootEnabled() : false,
  heroBootEnabled: typeof window !== "undefined" ? readHeroBootEnabled() : true,
  kernel: { heartbeat: null, lastCommand: null, lastUsage: null, connected: false },
  cpu: { pipeline: initialPipeline, lastMessage: null },
  memory: { slots: [], lastRecall: null, connected: false },
  io: { events: [] },
  gpu: { heatmap: emptyHeatmap(), activeWorkers: 0, lastDispatch: null, dispatchSeq: 0 },
  graph: { activeNodeIds: new Set<string>(), taskId: null },
  hydraConfigured: false,
  supabaseConfigured: false,
  selectedModelId: DEFAULT_OPENROUTER_MODEL_ID,

  applyRealtimeBatch: (batch) =>
    set((s) => {
      let state = s;
      if (batch.kernelHeartbeat !== undefined || batch.kernelConnected !== undefined) {
        state = {
          ...state,
          kernel: {
            ...state.kernel,
            ...(batch.kernelHeartbeat !== undefined
              ? { heartbeat: batch.kernelHeartbeat, connected: true }
              : {}),
            ...(batch.kernelConnected !== undefined
              ? { connected: batch.kernelConnected }
              : {}),
          },
        };
      }
      if (batch.kernelCommand !== undefined) {
        state = {
          ...state,
          kernel: { ...state.kernel, lastCommand: batch.kernelCommand },
        };
      }
      if (batch.kernelUsage !== undefined) {
        state = {
          ...state,
          kernel: { ...state.kernel, lastUsage: batch.kernelUsage },
        };
      }
      if (batch.cpuStep) {
        const { step, status, message } = batch.cpuStep;
        const completed = [...state.cpu.pipeline.completedSteps];
        if (status === "complete" && !completed.includes(step)) {
          completed.push(step);
        }
        state = {
          ...state,
          cpu: {
            pipeline: {
              ...state.cpu.pipeline,
              currentStep: status === "complete" ? null : step,
              completedSteps: completed,
            },
            lastMessage: message ?? state.cpu.lastMessage,
          },
        };
      }
      if (batch.cpuPipeline) {
        state = {
          ...state,
          cpu: {
            ...state.cpu,
            pipeline: { ...state.cpu.pipeline, ...batch.cpuPipeline },
          },
        };
      }
      if (batch.memorySlots?.length) {
        state = {
          ...state,
          memory: {
            ...state.memory,
            slots: [...batch.memorySlots, ...state.memory.slots].slice(0, 12),
          },
        };
      }
      if (batch.memoryRecall !== undefined) {
        state = {
          ...state,
          memory: { ...state.memory, lastRecall: batch.memoryRecall },
        };
      }
      if (batch.ioEvents?.length) {
        state = {
          ...state,
          io: {
            events: [...batch.ioEvents, ...state.io.events].slice(0, 20),
          },
        };
      }
      if (batch.gpuDispatch) {
        const d = batch.gpuDispatch;
        const heatmap = emptyHeatmap();
        for (const z of d.hotZones) {
          if (z.x >= 0 && z.x < 16 && z.y >= 0 && z.y < 16) {
            heatmap[z.y][z.x] = Math.min(1, z.heat);
          }
        }
        state = {
          ...state,
          gpu: {
            heatmap,
            activeWorkers: d.activeWorkers,
            lastDispatch: d,
            dispatchSeq: state.gpu.dispatchSeq + 1,
          },
        };
      }
      if (batch.gpuHeatUpdates?.length) {
        const heatmap = state.gpu.heatmap.map((row) => [...row]);
        for (const { x, y, heat } of batch.gpuHeatUpdates) {
          if (x >= 0 && x < 16 && y >= 0 && y < 16) {
            heatmap[y][x] = Math.min(1, heat);
          }
        }
        state = { ...state, gpu: { ...state.gpu, heatmap } };
      }
      if (batch.gpuWorkers !== undefined) {
        state = {
          ...state,
          gpu: { ...state.gpu, activeWorkers: batch.gpuWorkers },
        };
      }
      if (batch.graphNodeActive?.length) {
        const next = new Set(state.graph.activeNodeIds);
        let taskId = state.graph.taskId;
        for (const event of batch.graphNodeActive) {
          if (event.active) next.add(event.nodeId);
          else next.delete(event.nodeId);
          if (event.taskId) taskId = event.taskId;
        }
        state = {
          ...state,
          graph: { activeNodeIds: next, taskId },
        };
      }
      return state;
    }),
  setKernelHeartbeat: (h) =>
    set((s) => ({ kernel: { ...s.kernel, heartbeat: h, connected: true } })),
  setKernelCommand: (cmd) =>
    set((s) => ({ kernel: { ...s.kernel, lastCommand: cmd } })),
  setKernelUsage: (u) =>
    set((s) => ({ kernel: { ...s.kernel, lastUsage: u } })),
  setKernelConnected: (v) =>
    set((s) => ({ kernel: { ...s.kernel, connected: v } })),
  setCpuStep: (step, status, message) =>
    set((s) => {
      const completed = [...s.cpu.pipeline.completedSteps];
      if (status === "complete" && !completed.includes(step)) {
        completed.push(step);
      }
      return {
        cpu: {
          pipeline: {
            ...s.cpu.pipeline,
            currentStep: status === "complete" ? null : step,
            completedSteps: completed,
          },
          lastMessage: message ?? s.cpu.lastMessage,
        },
      };
    }),
  setCpuPipeline: (p) =>
    set((s) => ({
      cpu: { ...s.cpu, pipeline: { ...s.cpu.pipeline, ...p } },
    })),
  addMemorySlot: (slot) =>
    set((s) => ({
      memory: { ...s.memory, slots: [slot, ...s.memory.slots].slice(0, 12) },
    })),
  setMemoryRecall: (r) =>
    set((s) => ({ memory: { ...s.memory, lastRecall: r } })),
  setMemoryConnected: (v) =>
    set((s) => ({ memory: { ...s.memory, connected: v } })),
  pushIoEvent: (e) =>
    set((s) => ({
      io: { events: [e, ...s.io.events].slice(0, 20) },
    })),
  setGpuDispatch: (d) =>
    set((s) => {
      const heatmap = emptyHeatmap();
      for (const z of d.hotZones) {
        if (z.x >= 0 && z.x < 16 && z.y >= 0 && z.y < 16) {
          heatmap[z.y][z.x] = Math.min(1, z.heat);
        }
      }
      return {
        gpu: {
          heatmap,
          activeWorkers: d.activeWorkers,
          lastDispatch: d,
          dispatchSeq: s.gpu.dispatchSeq + 1,
        },
      };
    }),
  updateGpuHeat: (x, y, heat) =>
    set((s) => {
      const heatmap = s.gpu.heatmap.map((row) => [...row]);
      if (x >= 0 && x < 16 && y >= 0 && y < 16) {
        heatmap[y][x] = Math.min(1, heat);
      }
      return { gpu: { ...s.gpu, heatmap } };
    }),
  setGpuWorkers: (n) => set((s) => ({ gpu: { ...s.gpu, activeWorkers: n } })),
  setGraphNodeActive: (event) =>
    set((s) => {
      const next = new Set(s.graph.activeNodeIds);
      if (event.active) next.add(event.nodeId);
      else next.delete(event.nodeId);
      return {
        graph: {
          activeNodeIds: next,
          taskId: event.taskId ?? s.graph.taskId,
        },
      };
    }),
  setConfigFlags: (hydra, supabase) =>
    set({ hydraConfigured: hydra, supabaseConfigured: supabase }),
  setSelectedModelId: (id) => {
    const next = isOpenRouterModelId(id) ? id : DEFAULT_OPENROUTER_MODEL_ID;
    persistModelId(next);
    set({ selectedModelId: next });
  },
  hydrateModelFromStorage: () => set({ selectedModelId: readStoredModelId() }),
  resetGpuHeat: () =>
    set((s) => ({
      gpu: { ...s.gpu, heatmap: emptyHeatmap(), activeWorkers: 0 },
    })),
  setBootComplete: (v) => set({ bootComplete: v }),
  setHeroBootEnabled: (v) => {
    persistHeroBootEnabled(v);
    set({ heroBootEnabled: v, bootComplete: v ? false : true });
  },
  hydrateHeroBootFromStorage: () => {
    const enabled = readHeroBootEnabled();
    set({ heroBootEnabled: enabled, bootComplete: !enabled });
  },
}));

export { CPU_STEPS };
