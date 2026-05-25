import { NextResponse } from "next/server";
import {
  isHydraConfigured,
  getHydraClient,
  getHydraTenantId,
} from "@/lib/hydradb/client";

export async function GET() {
  if (!isHydraConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: "HYDRADB_API_KEY missing",
    });
  }

  const hydra = getHydraClient();
  const tenantId = getHydraTenantId();

  try {
    await hydra!.fetch.listData({
      tenant_id: tenantId,
      kind: "memories",
      page: 1,
      page_size: 1,
    });
    return NextResponse.json({ ok: true, configured: true, tenant_id: tenantId });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      configured: true,
      tenant_id: tenantId,
      error: e instanceof Error ? e.message : "verify failed",
    });
  }
}
