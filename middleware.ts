import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optional legacy-host redirect for an old Vercel project URL.
 * Set on the *old* deployment: DEMO_DEPLOY_LEGACY_HOST + DEMO_DEPLOY_URL (target).
 */
export function middleware(request: NextRequest) {
  const legacyHost = process.env.DEMO_DEPLOY_LEGACY_HOST?.trim();
  const targetBase =
    process.env.DEMO_DEPLOY_URL?.trim() ??
    process.env.NEXT_PUBLIC_DEMO_DEPLOY_URL?.trim();
  if (!legacyHost || !targetBase) {
    return NextResponse.next();
  }

  const host = (request.headers.get("host") ?? "").split(":")[0];
  if (host !== legacyHost) {
    return NextResponse.next();
  }

  try {
    const dest = new URL(targetBase);
    const incoming = request.nextUrl;
    dest.pathname = incoming.pathname;
    dest.search = incoming.search;
    return NextResponse.redirect(dest, 308);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
