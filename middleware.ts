import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import {
  getAccessTokenCookieName,
  getSupabaseAuthClient,
} from "@/lib/supabase-auth"

const PUBLIC_PATH_PREFIXES = ["/_next", "/favicon.ico"]
const PUBLIC_PATHS = new Set(["/login", "/api/login", "/api/logout"])

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const accessToken = request.cookies.get(getAccessTokenCookieName())?.value
  const supabase = getSupabaseAuthClient()
  const {
    data: { user },
  } = accessToken ? await supabase.auth.getUser(accessToken) : { data: { user: null } }
  const isLoggedIn = Boolean(user)

  if (pathname === "/login") {
    return isLoggedIn
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next()
  }

  if (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url)
    const nextPath = `${pathname}${search}`
    loginUrl.searchParams.set("next", nextPath)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
}
