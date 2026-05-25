import "server-only";

import { getGeminiKeyFault } from "@/lib/config/deploy-hint";
import { getGeminiApiKey, readTrimmedEnv } from "@/lib/config/env";
import {
  DEMO_WEB_APP_FILES,
  type BuildManifestFile,
} from "@/lib/os/build-manifest";

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

/** Build-demo-only fault (matches user-facing copy). */
export function getBuildGeminiKeyFault(): string {
  return getGeminiKeyFault();
}

const DEFAULT_BUILD_MODEL = "gemini-2.0-flash";

const BUILD_SYSTEM = `You are a senior frontend engineer generating a minimal SaaS dashboard web app for a live demo hosted at /demo.

Return ONLY valid JSON (no markdown fences) with this shape:
{
  "files": [
    { "path": "preview.html", "content": "<!DOCTYPE html>..." },
    { "path": "app/layout.tsx", "content": "..." },
    { "path": "app/globals.css", "content": "..." },
    { "path": "components/Hero.tsx", "content": "..." },
    { "path": "app/page.tsx", "content": "..." }
  ]
}

Rules:
- preview.html MUST be a complete, interactive standalone web app: inline CSS and optional inline JS only (no CDN). Include sidebar nav, stat cards, a data table or activity feed, and clickable buttons that update UI state. It will be hosted full-page at /demo.
- Other paths are TypeScript/CSS source shown in a code editor — keep them consistent with preview.html branding.
- Use DevFactory OS accent #00ffb2 on dark #0a0f14 background.
- Keep each file concise (preview.html under ~8KB).
- No explanations outside JSON.`;

export function getBuildModelId(): string {
  return readTrimmedEnv("GEMINI_MODEL") ?? DEFAULT_BUILD_MODEL;
}

export function isBuildGeminiConfigured(): boolean {
  return getGeminiApiKey() !== undefined;
}

/** Strip markdown code fences and leading/trailing noise from model text. */
export function stripMarkdownFences(text: string): string {
  let s = text.trim();
  const fence = /^```(?:json|html|tsx?|javascript|css)?\s*\n?/i;
  if (fence.test(s)) {
    s = s.replace(fence, "").replace(/\n?```\s*$/i, "").trim();
  }
  return s;
}

function buildGeminiUrl(model: string): string {
  return `${GEMINI_API_BASE}/${model}:generateContent`;
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

function parseFilesJson(raw: string): BuildManifestFile[] | null {
  const cleaned = stripMarkdownFences(raw);
  try {
    const parsed = JSON.parse(cleaned) as {
      files?: Array<{ path?: string; content?: string }>;
    };
    if (!Array.isArray(parsed.files) || parsed.files.length === 0) return null;
    const files: BuildManifestFile[] = [];
    for (const f of parsed.files) {
      if (typeof f.path === "string" && typeof f.content === "string") {
        files.push({ path: f.path.trim(), content: f.content });
      }
    }
    return files.length ? files : null;
  } catch {
    return null;
  }
}

/** If model returned raw HTML only, wrap as preview.html. */
function coerceHtmlBundle(raw: string): BuildManifestFile[] | null {
  const cleaned = stripMarkdownFences(raw);
  if (!cleaned.includes("<!DOCTYPE") && !cleaned.includes("<html")) return null;
  const html = cleaned;
  return [
    { path: "preview.html", content: html },
    {
      path: "app/page.tsx",
      content: `export default function Page() {
  return (
    <main className="hero">
      <span className="badge">DevFactory OS</span>
      <h1>Generated Web App</h1>
      <p>See preview.html for the live dashboard.</p>
    </main>
  );
}
`,
    },
  ];
}

function ensurePreviewFile(files: BuildManifestFile[]): BuildManifestFile[] {
  const hasPreview = files.some((f) => f.path === "preview.html");
  if (hasPreview) return files;
  const page = files.find((f) => f.path.endsWith(".html"));
  if (page) {
    return [
      ...files.filter((f) => f !== page),
      { path: "preview.html", content: page.content },
    ];
  }
  return files;
}

async function callGeminiBuild(prompt: string): Promise<string> {
  const key = getGeminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY missing");

  const model = getBuildModelId();
  const res = await fetch(buildGeminiUrl(model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": key,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: BUILD_SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.4,
      },
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    let msg = `Gemini HTTP ${res.status}`;
    try {
      const j = JSON.parse(raw) as GeminiGenerateResponse;
      if (j.error?.message) msg = j.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  let data: GeminiGenerateResponse;
  try {
    data = JSON.parse(raw) as GeminiGenerateResponse;
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  if (!text.trim()) throw new Error("Gemini returned empty response");
  return text;
}

/**
 * Generate web app files via Gemini Flash (build path only — not OpenRouter).
 * Falls back to static demo manifest on parse/API errors.
 */
export async function generateWebAppShell(
  prompt: string
): Promise<{ files: BuildManifestFile[]; source: "gemini" | "fallback" }> {
  const userPrompt =
    prompt.trim() ||
    "minimal SaaS dashboard web app with sidebar, stats cards, nav tabs, and dark terminal aesthetic";

  if (!isBuildGeminiConfigured()) {
    return { files: [...DEMO_WEB_APP_FILES], source: "fallback" };
  }

  try {
    const raw = await callGeminiBuild(userPrompt);
    const fromJson = parseFilesJson(raw);
    if (fromJson) {
      return {
        files: ensurePreviewFile(fromJson),
        source: "gemini",
      };
    }
    const fromHtml = coerceHtmlBundle(raw);
    if (fromHtml) {
      return { files: ensurePreviewFile(fromHtml), source: "gemini" };
    }
    throw new Error("Could not parse Gemini build response");
  } catch {
    return { files: [...DEMO_WEB_APP_FILES], source: "fallback" };
  }
}
