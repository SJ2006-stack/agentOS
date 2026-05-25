export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ALL_SUB_PREFIXES, bootHydraMemorySlots } from "@/lib/hydradb/memory";
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
    prefixes: [...ALL_SUB_PREFIXES],
  });
}
