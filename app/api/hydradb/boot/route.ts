import { NextResponse } from "next/server";
import { bootHydraMemorySlots } from "@/lib/hydradb/memory";
import { ensureTenant, isHydraConfigured } from "@/lib/hydradb/client";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";

export async function POST() {
  if (!isHydraConfigured()) {
    return NextResponse.json(
      { ok: false, error: "HYDRADB_API_KEY not configured" },
      { status: 503 }
    );
  }

  const tenantId = await ensureTenant();
  const boot = await bootHydraMemorySlots();

  if (boot.ok && boot.seeded > 0) {
    await broadcastOsEvent("os:memory", "indexing", {
      agentId: "boot",
      status: "complete",
      seeded: boot.seeded,
    });
  }

  return NextResponse.json({
    ok: boot.ok,
    tenant_id: tenantId,
    seeded: boot.seeded,
    prefixes: [
      "kernel.orchestrator",
      "cpu.intake",
      "cpu.plan",
      "cpu.route",
      "cpu.dispatch",
      "cpu.verify",
      "cpu.commit",
      "io.bus",
    ],
  });
}
