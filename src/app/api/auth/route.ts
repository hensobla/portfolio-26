import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password !== process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const from = req.nextUrl.searchParams.get("from") ?? "/";
  const res = NextResponse.json({ ok: true, redirect: from });

  res.cookies.set("portfolio_auth", process.env.AUTH_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // 30-day session
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
