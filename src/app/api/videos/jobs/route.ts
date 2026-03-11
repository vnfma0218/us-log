import { NextResponse } from "next/server"

import { getCurrentUserAndCoupleId } from "@/lib/current-user-couple"
import { createClient } from "@/utils/supabase/server"

export async function GET() {
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
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ jobs: data ?? [] })
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const memoryId = typeof body?.memoryId === "string" ? body.memoryId : null
  const style = typeof body?.style === "string" ? body.style : "slideshow"
  const bgm = typeof body?.bgm === "string" ? body.bgm : null
  const requestedDuration = Number(body?.durationSec)
  const durationSec = Number.isFinite(requestedDuration)
    ? Math.max(5, Math.min(120, Math.floor(requestedDuration)))
    : 30

  try {
    const { coupleId, userId } = await getCurrentUserAndCoupleId()
    const supabase = await createClient()

    if (memoryId) {
      const { data: targetMemory, error: memoryError } = await supabase
        .from("memories")
        .select("id")
        .eq("id", memoryId)
        .eq("couple_id", coupleId)
        .maybeSingle()

      if (memoryError) {
        return NextResponse.json({ error: memoryError.message }, { status: 500 })
      }
      if (!targetMemory) {
        return NextResponse.json(
          { error: "현재 커플의 추억만 영상으로 생성할 수 있습니다." },
          { status: 400 }
        )
      }
    }

    const { data: created, error: createError } = await supabase
      .from("video_jobs")
      .insert({
        couple_id: coupleId,
        requested_by: userId,
        memory_id: memoryId,
        status: "queued",
        style,
        duration_sec: durationSec,
        bgm,
      })
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
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ job: created }, { status: 201 })
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
