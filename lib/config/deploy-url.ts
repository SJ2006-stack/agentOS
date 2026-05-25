/** Suffix shown only in local dev when no deploy URL env is configured. */
export const DEMO_DEPLOY_URL_HINT_SUFFIX = " (set DEMO_DEPLOY_URL)";

/** Canonical demo entry path (vercel.json may redirect /demo → /final-demo). */
export const DEFAULT_DEMO_DEPLOY_PATH = "/demo";

const LOCALHOST_HINT = `http://localhost:3000${DEMO_DEPLOY_URL_HINT_SUFFIX}`;

/** Returned when production cannot resolve a deploy URL (never shown as a live link). */
export const DEPLOY_URL_UNCONFIGURED =
  "Deploy URL not configured — set DEMO_DEPLOY_URL in Vercel (Project → Environment Variables), redeploy, then run the demo again.";

/** Read env at runtime; dynamic key avoids Next inlining unset build-time literals (server). */
function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** Demo path segment from env (default `/demo`). */
export function getDemoDeployPath(): string {
  const raw = readEnv("DEMO_DEPLOY_PATH");
  if (!raw) return DEFAULT_DEMO_DEPLOY_PATH;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function urlHasExplicitPath(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = parsed.pathname;
    return path.length > 0 && path !== "/";
  } catch {
    return false;
  }
}

/**
 * Append DEMO_DEPLOY_PATH when the configured URL is origin-only.
 * URLs that already include a path (e.g. `/demo`) are left unchanged.
 */
export function withDemoDeployPath(url: string): string {
  if (isDeployUrlPlaceholder(url) || url === DEPLOY_URL_UNCONFIGURED) return url;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!urlHasExplicitPath(url)) {
      parsed.pathname = getDemoDeployPath();
    }
    const href = parsed.toString();
    if (href.endsWith("/") && parsed.pathname !== "/") {
      return href.slice(0, -1);
    }
    return href;
  } catch {
    const base = stripTrailingSlash(url);
    return `${base}${getDemoDeployPath()}`;
  }
}

function finalizeDemoDeployUrl(url: string): string {
  if (url === DEPLOY_URL_UNCONFIGURED || isDeployUrlPlaceholder(url)) return url;
  return withDemoDeployPath(ensureHttpsDeployUrl(url));
}

/** Host or full URL from Vercel → canonical https origin. */
function toHttpsOrigin(hostOrUrl: string): string {
  const trimmed = stripTrailingSlash(hostOrUrl);
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function hostnameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(
      url.startsWith("http") ? url : `https://${url}`
    );
    return parsed.hostname;
  } catch {
    return null;
  }
}

function isLocalhostHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  );
}

/**
 * Vercel per-deployment / team preview hosts (e.g. agent-abc123-sj2006s-projects.vercel.app).
 * These are not the stable production domain users should share.
 */
export function isVercelPerDeploymentHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host.endsWith("-projects.vercel.app")) return true;
  // Git-branch previews: my-app-git-feature-user.vercel.app (3+ hyphen segments before .vercel.app)
  if (host.endsWith(".vercel.app") && host.includes("-git-")) return true;
  return false;
}

/** True when URL is an auto-generated Vercel deployment host, not a configured production domain. */
export function isUnstableDeployUrl(url: string): boolean {
  const host = hostnameFromUrl(url);
  if (!host) return false;
  if (isLocalhostHost(host)) return false;
  return isVercelPerDeploymentHost(host);
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

/**
 * User-configured production URL. Always wins over Vercel auto-detected hosts.
 * Uses static `process.env.NEXT_PUBLIC_*` reads so values are inlined in the client bundle.
 */
function resolveExplicitDeployUrl(): string | undefined {
  const fromServer = readEnv("DEMO_DEPLOY_URL");
  const fromPublic = trimOrUndefined(process.env.NEXT_PUBLIC_DEMO_DEPLOY_URL);
  const fromSite = trimOrUndefined(process.env.NEXT_PUBLIC_SITE_URL);
  const explicit = fromServer ?? fromPublic ?? fromSite;
  if (!explicit) return undefined;
  const normalized = withDemoDeployPath(
    ensureHttpsDeployUrl(stripTrailingSlash(explicit))
  );
  if (isUnstableDeployUrl(normalized)) return undefined;
  return normalized;
}

function resolveVercelDeployOrigin(): string | undefined {
  const productionHost = readEnv("VERCEL_PROJECT_PRODUCTION_URL");
  const branchHost = readEnv("VERCEL_BRANCH_URL");
  const deploymentHost = readEnv("VERCEL_URL");

  const candidates: string[] = [];
  if (productionHost) candidates.push(toHttpsOrigin(productionHost));
  if (branchHost) candidates.push(toHttpsOrigin(branchHost));
  if (deploymentHost) candidates.push(toHttpsOrigin(deploymentHost));

  for (const origin of candidates) {
    if (!isUnstableDeployUrl(origin)) return origin;
  }

  if (productionHost) return toHttpsOrigin(productionHost);
  return undefined;
}

function resolvePublicAppUrl(): string | undefined {
  const appUrl =
    trimOrUndefined(process.env.NEXT_PUBLIC_APP_URL) ??
    readEnv("NEXT_PUBLIC_APP_URL");
  if (!appUrl) return undefined;
  if (process.env.NODE_ENV === "production" && isLocalhostDeployUrl(appUrl)) {
    return undefined;
  }
  const normalized = stripTrailingSlash(appUrl);
  if (isUnstableDeployUrl(normalized)) return undefined;
  return normalized;
}

function resolvePublicVercelDeployUrl(): string | undefined {
  const publicVercel = trimOrUndefined(process.env.NEXT_PUBLIC_VERCEL_DEPLOY_URL);
  if (!publicVercel) return undefined;
  const normalized = ensureHttpsDeployUrl(stripTrailingSlash(publicVercel));
  if (isUnstableDeployUrl(normalized)) return undefined;
  return normalized;
}

export type ResolveDemoDeployUrlOptions = {
  /** Client-only; used only in local dev when env vars are unset. */
  clientOrigin?: string;
  /** Dev-only override from DeployReveal input. */
  devOverride?: string;
};

/**
 * Resolve the URL shown in the demo "Deploy complete" modal.
 *
 * Priority:
 * 1. DEMO_DEPLOY_URL / NEXT_PUBLIC_DEMO_DEPLOY_URL / NEXT_PUBLIC_SITE_URL (never beaten by VERCEL_URL)
 * 2. NEXT_PUBLIC_APP_URL (non-localhost, non–per-deployment in prod)
 * 3. VERCEL_PROJECT_PRODUCTION_URL → VERCEL_BRANCH_URL → VERCEL_URL (skip per-deployment hosts)
 * 4. NEXT_PUBLIC_VERCEL_DEPLOY_URL (if stable)
 * 5. window.location.origin (local dev only) / devOverride
 * 6. localhost hint (dev) / DEPLOY_URL_UNCONFIGURED (prod)
 *
 * Set DEMO_DEPLOY_URL in Vercel Production env to your stable app URL (not *-projects.vercel.app).
 */
export function resolveDemoDeployUrl(
  options?: ResolveDemoDeployUrlOptions
): string {
  const explicit = resolveExplicitDeployUrl();
  if (explicit) return explicit;

  const devOverride = options?.devOverride?.trim();
  if (devOverride && process.env.NODE_ENV !== "production") {
    return finalizeDemoDeployUrl(stripTrailingSlash(devOverride));
  }

  const appUrl = resolvePublicAppUrl();
  if (appUrl) return finalizeDemoDeployUrl(appUrl);

  const vercelOrigin = resolveVercelDeployOrigin();
  if (vercelOrigin) return finalizeDemoDeployUrl(vercelOrigin);

  const publicVercel = resolvePublicVercelDeployUrl();
  if (publicVercel) return finalizeDemoDeployUrl(publicVercel);

  const clientOrigin = options?.clientOrigin?.trim();
  if (clientOrigin && process.env.NODE_ENV !== "production") {
    if (!isUnstableDeployUrl(clientOrigin)) {
      return finalizeDemoDeployUrl(stripTrailingSlash(clientOrigin));
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return LOCALHOST_HINT;
  }

  return DEPLOY_URL_UNCONFIGURED;
}

/** Full demo deploy URL (origin + DEMO_DEPLOY_PATH) for build events and server use. */
export function getDemoDeployUrl(): string {
  return resolveDemoDeployUrl();
}

/** Stable redirect target for legacy / per-deployment hosts (includes /demo path). */
export function getDemoDeployRedirectUrl(): string | null {
  const configured = getConfiguredDemoDeployUrl();
  if (configured) return configured;

  const raw =
    readEnv("DEMO_DEPLOY_URL") ??
    trimOrUndefined(process.env.NEXT_PUBLIC_DEMO_DEPLOY_URL);
  if (!raw) return null;

  const normalized = withDemoDeployPath(
    ensureHttpsDeployUrl(stripTrailingSlash(raw))
  );
  if (isUnstableDeployUrl(normalized) || isDeployUrlUnresolved(normalized)) {
    return null;
  }
  return normalized;
}

/** Configured production URL from env only (for display override over stored build events). */
export function getConfiguredDemoDeployUrl(): string | null {
  const explicit = resolveExplicitDeployUrl();
  if (explicit && !isDeployUrlUnresolved(explicit)) return explicit;
  const resolved = resolveDemoDeployUrl();
  if (isDeployUrlUnresolved(resolved) || isUnstableDeployUrl(resolved)) return null;
  return resolved;
}

/** Prefer env + re-resolve unstable stored URLs from the build event. */
export function resolveDemoDeployUrlForDisplay(
  stored: string | null,
  options?: ResolveDemoDeployUrlOptions
): string | null {
  const configured = getConfiguredDemoDeployUrl();
  if (configured) return configured;

  if (stored && !isDeployUrlPlaceholder(stored) && !isDeployUrlUnresolved(stored)) {
    if (!isUnstableDeployUrl(stored)) {
      return ensureHttpsDeployUrl(stored);
    }
  }

  const resolved = resolveDemoDeployUrl(options);
  return isDeployUrlUnresolved(resolved) ? null : resolved;
}

/** Hosts that should redirect to DEMO_DEPLOY_URL (legacy + auto-detected per-deployment). */
export function shouldRedirectLegacyDeployHost(host: string): boolean {
  const normalized = host.split(":")[0].toLowerCase();
  const legacy = readEnv("DEMO_DEPLOY_LEGACY_HOST");
  if (legacy && normalized === legacy.toLowerCase()) return true;

  const listRaw = readEnv("DEMO_DEPLOY_LEGACY_HOSTS");
  if (listRaw) {
    for (const entry of listRaw.split(",")) {
      const h = entry.trim().toLowerCase();
      if (h && normalized === h) return true;
    }
  }

  const target = resolveExplicitDeployUrl();
  if (!target) return false;

  const targetHost = hostnameFromUrl(target);
  if (targetHost && normalized === targetHost.toLowerCase()) return false;

  return isVercelPerDeploymentHost(normalized);
}
