/** Mirrors next.config basePath — set via NEXT_PUBLIC_BASE_PATH at build time. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix an app path with the Next.js basePath (e.g. `/agentOS`). */
export function withBasePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalized}`;
}

/** Absolute URL for server-side fetch to a route handler. */
export function absoluteApiUrl(path: string, origin?: string): string {
  const o =
    origin?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
          /\/$/,
          ""
        ));
  return `${o}${withBasePath(path)}`;
}
