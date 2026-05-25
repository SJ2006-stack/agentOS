import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getDemoDeployRedirectUrl,
  shouldRedirectLegacyDeployHost,
} from "@/lib/config/deploy-url";

/**
 * Redirect visitors on legacy / per-deployment Vercel hosts to the stable demo URL.
 *
 * Configure on the old or preview deployment:
 * - DEMO_DEPLOY_URL (+ optional DEMO_DEPLOY_PATH, default `/demo`)
 * - NEXT_PUBLIC_DEMO_DEPLOY_URL — full URL with path for client (e.g. …/demo)
 * - DEMO_DEPLOY_LEGACY_HOST — optional exact old hostname
 * - DEMO_DEPLOY_LEGACY_HOSTS — optional comma-separated list
 *
 * When DEMO_DEPLOY_URL is set, *-projects.vercel.app hosts auto-redirect without legacy env.
 */
export function middleware(request: NextRequest) {
  const target = getDemoDeployRedirectUrl();
  if (!target) {
    return NextResponse.next();
  }

  const host = (request.headers.get("host") ?? "").split(":")[0];
  if (!shouldRedirectLegacyDeployHost(host)) {
    return NextResponse.next();
  }

  try {
    const dest = new URL(target);
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest, 308);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
