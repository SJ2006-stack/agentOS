/** Suffix shown only in local dev when no deploy URL env is configured. */
export const DEMO_DEPLOY_URL_HINT_SUFFIX = " (set DEMO_DEPLOY_URL)";

const LOCALHOST_HINT = `http://localhost:3000${DEMO_DEPLOY_URL_HINT_SUFFIX}`;

/** Read env at runtime; dynamic key avoids Next inlining unset build-time literals. */
function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** Host or full URL from Vercel → canonical https origin. */
function toHttpsOrigin(hostOrUrl: string): string {
  const trimmed = stripTrailingSlash(hostOrUrl);
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function isDeployUrlPlaceholder(url: string): boolean {
  return (
    url.includes(DEMO_DEPLOY_URL_HINT_SUFFIX) ||
    url === "http://localhost:3000"
  );
}

export type ResolveDemoDeployUrlOptions = {
  /** Client-only; used only in local dev when env vars are unset. */
  clientOrigin?: string;
};

/**
 * Resolve the URL shown in the demo "Deploy complete" modal.
 *
 * Order: DEMO_DEPLOY_URL → NEXT_PUBLIC_DEMO_DEPLOY_URL → NEXT_PUBLIC_APP_URL
 * → VERCEL_URL / NEXT_PUBLIC_VERCEL_DEPLOY_URL (Vercel build + runtime)
 * → window.location.origin (local dev only) → localhost hint (local dev only).
 */
export function resolveDemoDeployUrl(
  options?: ResolveDemoDeployUrlOptions
): string {
  const explicit =
    readEnv("DEMO_DEPLOY_URL") ?? readEnv("NEXT_PUBLIC_DEMO_DEPLOY_URL");
  if (explicit) return stripTrailingSlash(explicit);

  const appUrl = readEnv("NEXT_PUBLIC_APP_URL");
  if (appUrl) return stripTrailingSlash(appUrl);

  const vercelUrl = readEnv("VERCEL_URL");
  if (vercelUrl) return toHttpsOrigin(vercelUrl);

  const publicVercel = readEnv("NEXT_PUBLIC_VERCEL_DEPLOY_URL");
  if (publicVercel) return stripTrailingSlash(publicVercel);

  const clientOrigin = options?.clientOrigin?.trim();
  if (clientOrigin && process.env.NODE_ENV !== "production") {
    return stripTrailingSlash(clientOrigin);
  }

  if (process.env.NODE_ENV !== "production") {
    return LOCALHOST_HINT;
  }

  return "http://localhost:3000";
}

/** Prefer a stored deploy URL from the build event; re-resolve placeholders on the client. */
export function resolveDemoDeployUrlForDisplay(
  stored: string | null,
  options?: ResolveDemoDeployUrlOptions
): string | null {
  if (!stored) return null;
  if (!isDeployUrlPlaceholder(stored)) return stored;
  return resolveDemoDeployUrl(options);
}
