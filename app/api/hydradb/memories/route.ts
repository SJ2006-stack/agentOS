import { NextResponse } from "next/server";
import { writeMemoryWithBroadcast } from "@/lib/hydradb/memory";
import { isHydraConfigured } from "@/lib/hydradb/client";

export async function POST(req: Request) {
  if (!isHydraConfigured()) {
    return NextResponse.json(
      { ok: false, error: "HYDRADB_API_KEY not configured" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { sub_tenant_id, text, infer, metadata } = body as {
    sub_tenant_id: string;
    text: string;
    infer?: boolean;
    metadata?: Record<string, unknown>;
  };

  if (!sub_tenant_id || !text) {
    return NextResponse.json(
      { ok: false, error: "sub_tenant_id and text required" },
      { status: 400 }
    );
  }

  const result = await writeMemoryWithBroadcast({
    sub_tenant_id,
    text,
    infer: infer ?? false,
    metadata,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
