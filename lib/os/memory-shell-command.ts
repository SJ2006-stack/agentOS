import { parseShellCommand } from "@/lib/os/types";

/** Shell commands that load or display HydraDB memory (popup should open). */
export function isHydraMemoryShellCommand(input: string): boolean {
  const parsed = parseShellCommand(input.trim());
  return (
    parsed.type === "recall" ||
    parsed.type === "memory_stream" ||
    parsed.type === "show_memory"
  );
}
