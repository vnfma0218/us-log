import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"

import { getCurrentUserAndCoupleId } from "@/lib/current-user-couple"
import { buildMemoryTitle, toDateKey, toIsoDate } from "@/lib/memory-utils"
import { createClient } from "@/utils/supabase/server"

const PHOTO_BUCKET = "photos"

export async function POST(request: Request) {
  const formData = await request.formData()
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File)
  const title = formData.get("title")?.toString().trim() ?? ""
  const summary = formData.get("summary")?.toString().trim() ?? ""
  const takenAt = formData.get("takenAt")?.toString() ?? null

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
  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 })
  }
  if (!summary) {
    return NextResponse.json({ error: "summary is required." }, { status: 400 })
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "at least one file is required." }, { status: 400 })
  }

  const eventDate = toIsoDate(takenAt)
  const memoryDateKey = toDateKey(eventDate)
  const supabase = await createClient()

  const { data: memory, error: memoryError } = await supabase
    .from("memories")
    .upsert(
      {
        couple_id: coupleId,
        memory_date: memoryDateKey,
        title: title || buildMemoryTitle(eventDate),
        summary,
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

  const uploadedPhotos = []

  for (const file of files) {
    const fileExt = file.name.includes(".") ? file.name.split(".").pop() : "jpg"
    const safeExt = fileExt?.replace(/[^a-zA-Z0-9]/g, "") || "jpg"
    const storagePath = `${coupleId}/${randomUUID()}.${safeExt}`
    const fileBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
        cacheControl: "3600",
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    uploadedPhotos.push({
      couple_id: coupleId,
      memory_id: memory.id,
      storage_path: storagePath,
      caption: file.name,
      taken_at: eventDate.toISOString(),
    })
  }

  const { error: photoError } = await supabase.from("photos").insert(uploadedPhotos)

  if (photoError) {
    return NextResponse.json({ error: photoError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, uploadedCount: uploadedPhotos.length })
}
