import { NextResponse } from "next/server"

import { getCurrentUserAndCoupleId } from "@/lib/current-user-couple"
import { createClient } from "@/utils/supabase/server"

export async function GET() {
  let coupleId = ""

  try {
    const authContext = await getCurrentUserAndCoupleId()
    coupleId = authContext.coupleId
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

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("memories")
    .select(
      `
      id,
      title,
      summary,
      memory_date,
      location_name,
      latitude,
      longitude,
      created_at,
      photos (
        id,
        storage_path,
        caption,
        taken_at,
        location_name,
        latitude,
        longitude,
        created_at
      )
    `
    )
    .eq("couple_id", coupleId)
    .order("memory_date", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ memories: data ?? [] })
}
