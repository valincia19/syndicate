import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value
  const { pathname } = request.nextUrl

  // Portal & Studio routes - require auth cookie
  if (pathname.startsWith("/portal") || pathname.startsWith("/studio")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("error", "unauthorized")
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/portal/:path*", "/studio/:path*", "/login", "/register"],
}
