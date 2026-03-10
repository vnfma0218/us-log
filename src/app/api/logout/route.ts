import { NextResponse } from "next/server"

import {
  getAccessTokenCookieName,
  getRefreshTokenCookieName,
} from "@/lib/supabase-auth"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: getAccessTokenCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  response.cookies.set({
    name: getRefreshTokenCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })

  return response
}
