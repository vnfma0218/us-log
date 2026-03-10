import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"

import {
  buildAutoSummary,
  buildMemoryTitle,
  toDateKey,
  toIsoDate,
} from "@/lib/memory-utils"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const PHOTO_BUCKET = "photos"

function toNumberOrNull(value: FormDataEntryValue | null) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file")
  const coupleId = formData.get("coupleId")?.toString()
  const caption = formData.get("caption")?.toString() ?? null
  const takenAt = formData.get("takenAt")?.toString() ?? null
  const locationName = formData.get("locationName")?.toString() ?? null
  const latitude = toNumberOrNull(formData.get("latitude"))
  const longitude = toNumberOrNull(formData.get("longitude"))

  if (!coupleId) {
    return NextResponse.json({ error: "coupleId is required." }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 })
  }

  const fileExt = file.name.includes(".") ? file.name.split(".").pop() : "jpg"
  const safeExt = fileExt?.replace(/[^a-zA-Z0-9]/g, "") || "jpg"
  const storagePath = `${coupleId}/${randomUUID()}.${safeExt}`
  const eventDate = toIsoDate(takenAt)
  const memoryDateKey = toDateKey(eventDate)
  const summary = buildAutoSummary({ date: eventDate, locationName, caption })
  const title = buildMemoryTitle(eventDate)
  const supabaseAdmin = getSupabaseAdmin()

  const fileBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabaseAdmin.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
      cacheControl: "3600",
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: memory, error: memoryError } = await supabaseAdmin
    .from("memories")
    .upsert(
      {
        couple_id: coupleId,
        memory_date: memoryDateKey,
        title,
        summary,
        location_name: locationName,
        latitude,
        longitude,
      },
      { onConflict: "couple_id,memory_date" }
    )
    .select("id")
    .single()

  if (memoryError || !memory) {
    return NextResponse.json(
      { error: memoryError?.message ?? "Failed to create memory row." },
      { status: 500 }
    )
  }

  const { error: photoError } = await supabaseAdmin.from("photos").insert({
    couple_id: coupleId,
    memory_id: memory.id,
    storage_path: storagePath,
    caption,
    taken_at: eventDate.toISOString(),
    location_name: locationName,
    latitude,
    longitude,
  })

  if (photoError) {
    return NextResponse.json({ error: photoError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
