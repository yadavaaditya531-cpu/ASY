import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionToken } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const expected = await sessionToken();
  if (!expected) return NextResponse.next();
  const { pathname } = request.nextUrl;
  // /api/cron authenticates with its own bearer secret.
  if (pathname === "/login" || pathname === "/api/cron") return NextResponse.next();
  if (request.cookies.get(SESSION_COOKIE)?.value === expected) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
