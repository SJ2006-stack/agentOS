import "server-only";

/** Primary + legacy alias for Google Gemini API key. */
const GEMINI_ENV_KEYS = ["GEMINI_API_KEY", "GOOGLE_API_KEY"] as const;

/**
 * Read a server env var at runtime. Bracket access avoids Next.js replacing
 * `process.env.FOO` with a build-time literal when the var was unset during build.
 */
export function readTrimmedEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** First non-empty Gemini key (GEMINI_API_KEY, then GOOGLE_API_KEY). */
export function getGeminiApiKey(): string | undefined {
  for (const key of GEMINI_ENV_KEYS) {
    const value = readTrimmedEnv(key);
    if (value) return value;
  }
  return undefined;
}

export function isGeminiApiKeySet(): boolean {
  return getGeminiApiKey() !== undefined;
}

/** Deploy URL shown at end of demo build flow. */
export function getDemoDeployUrl(): string {
  const explicit = readTrimmedEnv("DEMO_DEPLOY_URL");
  if (explicit) return explicit;
  const appUrl = readTrimmedEnv("NEXT_PUBLIC_APP_URL");
  if (appUrl) return appUrl.replace(/\/$/, "");
  return "http://localhost:3000 (set DEMO_DEPLOY_URL)";
}
