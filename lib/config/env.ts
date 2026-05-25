import "server-only";

/** Primary + legacy alias — never fall back to VERCEL_AI_GATEWAY_API_KEY. */
const OPENROUTER_ENV_KEYS = ["OPENROUTER_API_KEY", "OPENROUTER_KEY"] as const;

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

/** First non-empty OpenRouter key (OPENROUTER_API_KEY, then OPENROUTER_KEY). */
export function getOpenRouterApiKey(): string | undefined {
  for (const key of OPENROUTER_ENV_KEYS) {
    const value = readTrimmedEnv(key);
    if (value) return value;
  }
  return undefined;
}

export function isOpenRouterApiKeySet(): boolean {
  return getOpenRouterApiKey() !== undefined;
}
