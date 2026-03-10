import { NextRequest, NextResponse } from "next/server"

import { getSupabaseAdmin } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  const coupleId = request.nextUrl.searchParams.get("coupleId")
  if (!coupleId) {
    return NextResponse.json({ error: "coupleId is required." }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
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
