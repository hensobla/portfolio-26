import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/enter", "/api/auth"];

// Routes that exist for local development only. Any request to these in a
// non-development environment (Vercel preview / production / anywhere else)
// returns 404 — as if the route doesn't exist.
const DEV_ONLY_PATHS = ["/library"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Block dev-only routes outside `npm run dev`.
  // NODE_ENV is "development" only in `next dev`; both Vercel preview and
  // production set "production". This means /library is local-only and never
  // reachable from a deployed URL.
  if (
    DEV_ONLY_PATHS.some((p) => pathname.startsWith(p)) &&
    process.env.NODE_ENV !== "development"
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Always allow the password page, auth API, and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("portfolio_auth")?.value;

  if (token !== process.env.AUTH_SECRET) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/enter";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
