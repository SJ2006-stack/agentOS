import { NextResponse } from "next/server";
import { recallAllContext, recallPreferences } from "@/lib/hydradb/memory";
import { isHydraConfigured } from "@/lib/hydradb/client";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";

export async function POST(req: Request) {
  if (!isHydraConfigured()) {
    return NextResponse.json(
      { ok: false, error: "HYDRADB_API_KEY not configured" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { query, sub_tenant_id, aggregate } = body as {
    query: string;
    sub_tenant_id?: string;
    aggregate?: boolean;
  };

  if (!query) {
    return NextResponse.json({ ok: false, error: "query required" }, { status: 400 });
  }

  const result = aggregate
    ? await recallAllContext(query)
    : await recallPreferences({ query, sub_tenant_id });

  const chunks = aggregate
    ? (result as Awaited<ReturnType<typeof recallAllContext>>).chunks
    : (result as Awaited<ReturnType<typeof recallPreferences>>).chunks;
  const queryPaths = aggregate
    ? (result as Awaited<ReturnType<typeof recallAllContext>>).queryPaths
    : (result as Awaited<ReturnType<typeof recallPreferences>>).queryPaths;

  await broadcastOsEvent("os:memory", "recall_result", {
    query,
    chunks,
    queryPaths,
  });

  return NextResponse.json({ ok: true, chunks, queryPaths });
}
