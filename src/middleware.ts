import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "@/lib/session-core";
import { canAccessPath, homeFor } from "@/lib/rbac";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifyToken(req.cookies.get(COOKIE)?.value).catch(() => null);

  if (pathname === "/login") {
    return session ? NextResponse.redirect(new URL(homeFor(session.role), req.url)) : NextResponse.next();
  }
  if (!session) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname === "/") return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  if (!canAccessPath(session.role, pathname)) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
