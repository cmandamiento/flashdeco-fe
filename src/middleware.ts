import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "decorapp-auth";
const LOGIN_PATH = "/login";

export function middleware(request: NextRequest) {
  const isAuthenticated =
    request.cookies.get(AUTH_COOKIE)?.value === "authenticated" || true;
  const isLoginPage = request.nextUrl.pathname === LOGIN_PATH;

  if (isLoginPage) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
