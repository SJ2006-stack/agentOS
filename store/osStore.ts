"use client";

import { create } from "zustand";
import {
  CPU_STEPS,
  type CpuPipelineState,
  type CpuStep,
  type GpuDispatchPayload,
  type IoToolCall,
  type KernelHeartbeat,
  type MemoryRecallResult,
  type MemorySlotWrite,
  emptyHeatmap,
} from "@/lib/os/types";

interface OsState {
  kernel: {
    heartbeat: KernelHeartbeat | null;
    lastCommand: string | null;
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
  hydraConfigured: boolean;
  supabaseConfigured: boolean;

  setKernelHeartbeat: (h: KernelHeartbeat) => void;
  setKernelCommand: (cmd: string) => void;
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
  setConfigFlags: (hydra: boolean, supabase: boolean) => void;
  resetGpuHeat: () => void;
}

const initialPipeline: CpuPipelineState = {
  currentStep: null,
  taskId: null,
  completedSteps: [],
};

export const useOsStore = create<OsState>((set) => ({
  kernel: { heartbeat: null, lastCommand: null, connected: false },
  cpu: { pipeline: initialPipeline, lastMessage: null },
  memory: { slots: [], lastRecall: null, connected: false },
  io: { events: [] },
  gpu: { heatmap: emptyHeatmap(), activeWorkers: 0, lastDispatch: null, dispatchSeq: 0 },
  hydraConfigured: false,
  supabaseConfigured: false,

  setKernelHeartbeat: (h) =>
    set((s) => ({ kernel: { ...s.kernel, heartbeat: h, connected: true } })),
  setKernelCommand: (cmd) =>
    set((s) => ({ kernel: { ...s.kernel, lastCommand: cmd } })),
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
  setConfigFlags: (hydra, supabase) =>
    set({ hydraConfigured: hydra, supabaseConfigured: supabase }),
  resetGpuHeat: () =>
    set((s) => ({
      gpu: { ...s.gpu, heatmap: emptyHeatmap(), activeWorkers: 0 },
    })),
}));

export { CPU_STEPS };
