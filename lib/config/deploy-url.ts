/** Suffix shown only in local dev when no deploy URL env is configured. */
export const DEMO_DEPLOY_URL_HINT_SUFFIX = " (set DEMO_DEPLOY_URL)";

const LOCALHOST_HINT = `http://localhost:3000${DEMO_DEPLOY_URL_HINT_SUFFIX}`;

/** Returned when production cannot resolve a deploy URL (never shown as a live link). */
export const DEPLOY_URL_UNCONFIGURED =
  "Deploy URL not configured — set DEMO_DEPLOY_URL in Vercel (Project → Environment Variables), redeploy, then run the demo again.";

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

function isLocalhostHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  );
}

export function isLocalhostDeployUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
    );
    return isLocalhostHost(parsed.hostname);
  } catch {
    return trimmed.includes("localhost") || trimmed.includes("127.0.0.1");
  }
}

export function isDeployUrlPlaceholder(url: string): boolean {
  return (
    url.includes(DEMO_DEPLOY_URL_HINT_SUFFIX) ||
    url === "http://localhost:3000" ||
    url === LOCALHOST_HINT
  );
}

export function isDeployUrlUnresolved(url: string | null | undefined): boolean {
  if (url == null || url.length === 0) return true;
  if (url === DEPLOY_URL_UNCONFIGURED) return true;
  if (isDeployUrlPlaceholder(url)) return true;
  if (process.env.NODE_ENV === "production" && isLocalhostDeployUrl(url)) {
    return true;
  }
  return false;
}

/** Prefer https for Vercel/production open links; leaves dev localhost unchanged. */
export function ensureHttpsDeployUrl(url: string): string {
  if (isDeployUrlUnresolved(url)) return url;
  const trimmed = stripTrailingSlash(url);
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return toHttpsOrigin(trimmed);
  }
  if (
    trimmed.startsWith("http://") &&
    process.env.NODE_ENV === "production" &&
    !isLocalhostDeployUrl(trimmed)
  ) {
    return trimmed.replace(/^http:\/\//, "https://");
  }
  return trimmed;
}

function resolveVercelDeployOrigin(): string | undefined {
  const vercelEnv = readEnv("VERCEL_ENV");
  const productionHost = readEnv("VERCEL_PROJECT_PRODUCTION_URL");
  const deploymentHost = readEnv("VERCEL_URL");

  if (vercelEnv === "production" && productionHost) {
    return toHttpsOrigin(productionHost);
  }
  if (deploymentHost) return toHttpsOrigin(deploymentHost);
  if (productionHost) return toHttpsOrigin(productionHost);
  return undefined;
}

function resolvePublicAppUrl(): string | undefined {
  const appUrl = readEnv("NEXT_PUBLIC_APP_URL");
  if (!appUrl) return undefined;
  if (process.env.NODE_ENV === "production" && isLocalhostDeployUrl(appUrl)) {
    return undefined;
  }
  return stripTrailingSlash(appUrl);
}

export type ResolveDemoDeployUrlOptions = {
  /** Client-only; used only in local dev when env vars are unset. */
  clientOrigin?: string;
};

/**
 * Resolve the URL shown in the demo "Deploy complete" modal.
 *
 * Order: DEMO_DEPLOY_URL → NEXT_PUBLIC_DEMO_DEPLOY_URL → NEXT_PUBLIC_APP_URL (non-localhost in prod)
 * → VERCEL (production host on production, else VERCEL_URL) → NEXT_PUBLIC_VERCEL_DEPLOY_URL
 * → window.location.origin (local dev only) → localhost hint (local dev only)
 * → DEPLOY_URL_UNCONFIGURED (production) / localhost hint (dev).
 */
export function resolveDemoDeployUrl(
  options?: ResolveDemoDeployUrlOptions
): string {
  const explicit =
    readEnv("DEMO_DEPLOY_URL") ?? readEnv("NEXT_PUBLIC_DEMO_DEPLOY_URL");
  if (explicit) return ensureHttpsDeployUrl(stripTrailingSlash(explicit));

  const appUrl = resolvePublicAppUrl();
  if (appUrl) return ensureHttpsDeployUrl(appUrl);

  const vercelOrigin = resolveVercelDeployOrigin();
  if (vercelOrigin) return vercelOrigin;

  const publicVercel = readEnv("NEXT_PUBLIC_VERCEL_DEPLOY_URL");
  if (publicVercel) return ensureHttpsDeployUrl(stripTrailingSlash(publicVercel));

  const clientOrigin = options?.clientOrigin?.trim();
  if (clientOrigin && process.env.NODE_ENV !== "production") {
    return stripTrailingSlash(clientOrigin);
  }

  if (process.env.NODE_ENV !== "production") {
    return LOCALHOST_HINT;
  }

  return DEPLOY_URL_UNCONFIGURED;
}

/** Prefer a stored deploy URL from the build event; re-resolve placeholders on the client. */
export function resolveDemoDeployUrlForDisplay(
  stored: string | null,
  options?: ResolveDemoDeployUrlOptions
): string | null {
  if (!stored) return null;
  if (!isDeployUrlPlaceholder(stored) && !isDeployUrlUnresolved(stored)) {
    return ensureHttpsDeployUrl(stored);
  }
  const resolved = resolveDemoDeployUrl(options);
  return isDeployUrlUnresolved(resolved) ? null : resolved;
}
