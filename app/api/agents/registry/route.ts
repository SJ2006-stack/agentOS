export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  createAndPersistCustomAgent,
  listCustomRecords,
  loadCustomAgentsFromHydra,
} from "@/lib/agents/custom-registry";
import { listAllAgentTemplates } from "@/lib/os/agent-graph";
import { isHydraConfigured } from "@/lib/hydradb/client";

export async function GET() {
  const templates = listAllAgentTemplates();
  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      role: t.role,
      custom: t.id.startsWith("custom."),
    })),
    custom: listCustomRecords().map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
    })),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: "load" | "create";
    name?: string;
    role?: string;
  };

  if (body.action === "load") {
    if (!isHydraConfigured()) {
      return NextResponse.json(
        { ok: false, error: "HYDRADB_API_KEY not configured" },
        { status: 503 }
      );
    }
    const loaded = await loadCustomAgentsFromHydra();
    return NextResponse.json({ ok: true, loaded });
  }

  if (body.action === "create" && body.name && body.role) {
    if (!isHydraConfigured()) {
      return NextResponse.json(
        { ok: false, error: "HYDRADB_API_KEY not configured" },
        { status: 503 }
      );
    }
    try {
      const record = await createAndPersistCustomAgent({
        name: body.name,
        role: body.role,
      });
      return NextResponse.json({ ok: true, agent: record });
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "create failed" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json(
    { ok: false, error: "action must be load or create with name+role" },
    { status: 400 }
  );
}
