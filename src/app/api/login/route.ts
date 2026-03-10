import { NextResponse } from "next/server"

import {
  getAccessTokenCookieName,
  getRefreshTokenCookieName,
  getSupabaseAuthClient,
} from "@/lib/supabase-auth"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const id = typeof body?.id === "string" ? body.id.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!id || !password) {
    return NextResponse.json(
      { error: "아이디와 비밀번호를 모두 입력해 주세요." },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAuthClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: id,
    password,
  })

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    )
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: getAccessTokenCookieName(),
    value: data.session.access_token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: data.session.expires_in,
  })
  response.cookies.set({
    name: getRefreshTokenCookieName(),
    value: data.session.refresh_token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })

  return response
}
