import { NextResponse } from "next/server";
import {
  BUILD_GEMINI_KEY_FAULT,
  generateWebAppShell,
  getBuildModelId,
  isBuildGeminiConfigured,
} from "@/lib/ai/gemini-build";

export const runtime = "nodejs";

type BuildAppBody = {
  prompt?: string;
};

/** POST /api/os/build-app — Gemini Flash web shell generation (not OpenRouter). */
export async function POST(req: Request) {
  if (!isBuildGeminiConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: BUILD_GEMINI_KEY_FAULT.replace(/^\[fault\]\s*/, "").trim(),
        needsGemini: true,
      },
      { status: 503 }
    );
  }

  let body: BuildAppBody = {};
  try {
    body = (await req.json()) as BuildAppBody;
  } catch {
    /* empty body ok */
  }

  const prompt =
    typeof body.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim()
      : "minimal SaaS dashboard shell";

  const { files, source } = await generateWebAppShell(prompt);

  return NextResponse.json({
    ok: true,
    files: files.map((f) => ({ path: f.path, content: f.content })),
    source,
    model: getBuildModelId(),
  });
}
