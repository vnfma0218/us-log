import { NextResponse } from "next/server"

import { getCurrentUserAndCoupleId } from "@/lib/current-user-couple"
import { createClient } from "@/utils/supabase/server"

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params

  try {
    const { coupleId } = await getCurrentUserAndCoupleId()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("video_jobs")
      .select(
        `
        id,
        memory_id,
        status,
        style,
        duration_sec,
        bgm,
        progress,
        error_message,
        result_path,
        thumbnail_path,
        created_at,
        started_at,
        finished_at
      `
      )
      .eq("id", id)
      .eq("couple_id", coupleId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 })
    }

    return NextResponse.json({ job: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN"
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    if (message === "COUPLE_NOT_FOUND") {
      return NextResponse.json(
        { error: "현재 로그인한 유저가 속한 커플이 없습니다." },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = typeof body?.action === "string" ? body.action : ""

  if (action !== "cancel") {
    return NextResponse.json({ error: "지원하지 않는 액션입니다." }, { status: 400 })
  }

  try {
    const { coupleId } = await getCurrentUserAndCoupleId()
    const supabase = await createClient()

    const { data: existing, error: existingError } = await supabase
      .from("video_jobs")
      .select("id,status")
      .eq("id", id)
      .eq("couple_id", coupleId)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 })
    }
    if (existing.status === "done") {
      return NextResponse.json({ error: "완료된 작업은 취소할 수 없습니다." }, { status: 400 })
    }

    const { data: canceled, error: cancelError } = await supabase
      .from("video_jobs")
      .update({
        status: "failed",
        error_message: "사용자가 작업을 취소했습니다.",
        finished_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("couple_id", coupleId)
      .select(
        `
        id,
        memory_id,
        status,
        style,
        duration_sec,
        bgm,
        progress,
        error_message,
        result_path,
        thumbnail_path,
        created_at,
        started_at,
        finished_at
      `
      )
      .maybeSingle()

    if (cancelError) {
      return NextResponse.json({ error: cancelError.message }, { status: 500 })
    }

    return NextResponse.json({ job: canceled })
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN"
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    if (message === "COUPLE_NOT_FOUND") {
      return NextResponse.json(
        { error: "현재 로그인한 유저가 속한 커플이 없습니다." },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params

  try {
    const { coupleId } = await getCurrentUserAndCoupleId()
    const supabase = await createClient()

    const { data: existing, error: existingError } = await supabase
      .from("video_jobs")
      .select("id,status,result_path,thumbnail_path")
      .eq("id", id)
      .eq("couple_id", coupleId)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 })
    }
    if (existing.status === "processing") {
      return NextResponse.json(
        { error: "처리중인 작업은 먼저 취소 후 삭제해 주세요." },
        { status: 400 }
      )
    }

    const removablePaths = [existing.result_path, existing.thumbnail_path].filter(
      (value): value is string => Boolean(value)
    )

    if (removablePaths.length > 0) {
      await supabase.storage.from("videos").remove(removablePaths)
    }

    const { error: deleteError } = await supabase
      .from("video_jobs")
      .delete()
      .eq("id", id)
      .eq("couple_id", coupleId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN"
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    if (message === "COUPLE_NOT_FOUND") {
      return NextResponse.json(
        { error: "현재 로그인한 유저가 속한 커플이 없습니다." },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
