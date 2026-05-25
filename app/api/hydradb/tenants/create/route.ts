export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ensureTenant, isHydraConfigured } from "@/lib/hydradb/client";


export async function POST() {
  if (!isHydraConfigured()) {
    return NextResponse.json(
      { ok: false, error: "HYDRADB_API_KEY not configured" },
      { status: 503 }
    );
  }
  const tenantId = await ensureTenant();
  return NextResponse.json({ ok: true, tenant_id: tenantId });
}
