import { NextResponse } from "next/server";
import { getPublishedDemoPreview } from "@/lib/demo/preview-publish";

export const runtime = "nodejs";

/** GET — latest Gemini-generated preview HTML for /demo refresh. */
export async function GET() {
  const { html, source } = await getPublishedDemoPreview();
  return NextResponse.json({
    ok: true,
    html,
    source,
    hasGenerated: Boolean(html),
  });
}
