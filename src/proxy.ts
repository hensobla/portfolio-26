import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/enter", "/api/auth"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
