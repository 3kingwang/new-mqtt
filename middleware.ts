import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const username = request.cookies.get("mqtt_username")

  if (!username && request.nextUrl.pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/dashboard",
}
