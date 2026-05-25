export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { runWebSearch } from "@/lib/os/web-search";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { query?: string };
  const query = body.query?.trim() ?? "";
  if (!query) {
    return NextResponse.json(
      { ok: false, error: "query is required" },
      { status: 400 }
    );
  }

  const result = await runWebSearch(query);
  return NextResponse.json({
    ok: result.ok,
    query: result.query,
    provider: result.provider,
    hits: result.hits,
    summary: result.summary,
    error: result.error,
  });
}
