import "server-only";
import {
  BUILD_GEMINI_KEY_FAULT,
  generateWebAppShell,
  getBuildModelId,
  isBuildGeminiConfigured,
} from "@/lib/ai/gemini-build";
import { getDemoDeployUrl } from "@/lib/config/env";
import { broadcastGraphNodeActive } from "@/lib/os/graph-broadcast";
import { templateIdForCpuStep } from "@/lib/os/agent-graph-data";
import type { BuildManifestFile } from "@/lib/os/build-manifest";
import { setPipeline, startPipeline } from "@/lib/os/pipeline";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";
import { CPU_STEPS, type CpuStep } from "@/lib/os/types";
import type { PipelineWrite } from "@/lib/ai/run-cpu";

const STEP_MS = 380;
const CHUNK_CHARS = 72;
const CHUNK_MS = 38;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function broadcastCpuStep(
  step: CpuStep,
  taskId: string,
  completedSteps: CpuStep[],
  phase: "start" | "complete",
  message?: string
): Promise<void> {
  await Promise.all([
    broadcastOsEvent(
      "os:cpu",
      phase === "start" ? "step_start" : "step_complete",
      {
        step,
        taskId,
        status: phase === "start" ? "start" : "complete",
        message,
      }
    ),
    broadcastOsEvent("os:cpu", "pipeline_state", {
      currentStep: phase === "start" ? step : null,
      taskId,
      completedSteps,
    }),
  ]);
}

function defaultHotZones(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    x: (i * 3) % 16,
    y: (i * 2) % 16,
    heat: 0.55 + (i % 4) * 0.1,
  }));
}

function chunkContent(content: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += size) {
    chunks.push(content.slice(i, i + size));
  }
  return chunks.length ? chunks : [""];
}

async function streamFileChunks(
  taskId: string,
  path: string,
  content: string,
  core: number
): Promise<void> {
  const parts = chunkContent(content, CHUNK_CHARS);
  for (let index = 0; index < parts.length; index++) {
    await broadcastOsEvent("os:build", "chunk", {
      taskId,
      path,
      chunk: parts[index],
      index,
      total: parts.length,
      core,
      done: index === parts.length - 1,
    });
    await sleep(CHUNK_MS);
  }
}

export async function runBuildDemo(
  taskId: string,
  task: string,
  _origin?: string,
  write?: PipelineWrite
): Promise<void> {
  if (!isBuildGeminiConfigured()) {
    write?.(BUILD_GEMINI_KEY_FAULT);
    return;
  }

  startPipeline(taskId, task);
  write?.(`[cpu] build demo ${taskId} starting…\n`);

  const pitch =
    task.replace(/^build\s+/i, "").trim() || "minimal SaaS dashboard shell";
  let shellFiles: BuildManifestFile[] = [];

  const completedSteps: CpuStep[] = [];

  for (const step of CPU_STEPS) {
    write?.(`[cpu] ${step} starting…\n`);
    await broadcastCpuStep(step, taskId, completedSteps, "start");
    await broadcastGraphNodeActive({
      nodeId: templateIdForCpuStep(step),
      taskId,
      step,
    });

    setPipeline(taskId, { task, currentStep: step, completedSteps });

    if (step === "DISPATCH") {
      write?.(`[gpu] Gemini ${getBuildModelId()} generating web shell…\n`);
      const { files, source } = await generateWebAppShell(pitch);
      shellFiles = files;
      write?.(
        source === "gemini"
          ? `[build] Gemini generated ${shellFiles.length} files\n`
          : `[build] fallback shell (${shellFiles.length} files)\n`
      );

      const fileCount = shellFiles.length;
      const hotZones = defaultHotZones(fileCount);
      await broadcastOsEvent("os:gpu", "dispatch", {
        hotZones,
        activeWorkers: fileCount,
        taskId,
      });
      await broadcastGraphNodeActive({ nodeId: "gpu.worker", taskId, step });

      for (let w = 0; w < fileCount; w++) {
        await broadcastOsEvent("os:gpu", "worker_tick", {
          workerId: w,
          zone: hotZones[w],
          progress: 0.35,
        });
      }

      const manifestFiles = shellFiles.map((f, i) => ({
        path: f.path,
        core: i,
      }));

      await broadcastOsEvent("os:build", "manifest", { taskId, files: manifestFiles });
      write?.(`[build] manifest ${manifestFiles.length} files\n`);

      await Promise.all(
        shellFiles.map((file, core) =>
          streamFileChunks(taskId, file.path, file.content, core)
        )
      );

      await broadcastOsEvent("os:gpu", "batch_complete", {
        taskId,
        workersCompleted: fileCount,
      });
      write?.(`[gpu] ${fileCount} workers complete\n`);
    } else if (step === "VERIFY") {
      await broadcastOsEvent("os:build", "verify", {
        taskId,
        status: "running",
        message: "Type-checking assembled shell…",
      });
      await sleep(520);
      await broadcastOsEvent("os:build", "verify", {
        taskId,
        status: "pass",
        message: "Shell verified — ready to deploy",
      });
      write?.(`[build] verify pass\n`);
    } else if (step === "COMMIT") {
      const deployUrl = getDemoDeployUrl();
      await broadcastOsEvent("os:build", "deploy", { taskId, url: deployUrl });
      write?.(`[build] deployed → ${deployUrl}\n`);
    } else {
      await sleep(STEP_MS);
      write?.(`[cpu] ${step} complete\n`);
    }

    completedSteps.push(step);
    setPipeline(taskId, { task, currentStep: null, completedSteps });
    await broadcastCpuStep(step, taskId, completedSteps, "complete");
    await broadcastGraphNodeActive({ nodeId: "kernel.orchestrator", taskId });
  }

  write?.(`[kernel] build demo finished: ${taskId}\n`);
}
