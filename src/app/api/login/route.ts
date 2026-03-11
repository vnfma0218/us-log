import { NextResponse } from "next/server"

import { createClient } from "@/utils/supabase/server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!email || !password) {
    return NextResponse.json(
      { error: "이메일과 비밀번호를 모두 입력해 주세요." },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    )
  }

  return NextResponse.json({ ok: true, sessionExpiresIn: data.session.expires_in })
}
