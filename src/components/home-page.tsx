"use client"

import dynamic from "next/dynamic"
import { useCallback, useMemo, useState } from "react"
import * as exifr from "exifr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MarkerItem, MemoryItem } from "@/lib/types"

const MemoriesMap = dynamic(
  () => import("@/components/memories-map").then((mod) => mod.MemoriesMap),
  { ssr: false }
)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const defaultCoupleId = process.env.NEXT_PUBLIC_DEMO_COUPLE_ID ?? ""
const photosPublicBaseUrl = supabaseUrl
  ? `${supabaseUrl}/storage/v1/object/public/photos/`
  : ""

function photoUrl(path: string) {
  return `${photosPublicBaseUrl}${path}`
}

export function HomePage() {
  const [coupleId, setCoupleId] = useState(defaultCoupleId)
  const [caption, setCaption] = useState("")
  const [locationName, setLocationName] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [takenAt, setTakenAt] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMemories = useCallback(async () => {
    if (!coupleId.trim()) {
      setError("먼저 coupleId를 입력해 주세요.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/memories?coupleId=${encodeURIComponent(coupleId)}`)
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "데이터를 불러오지 못했습니다.")
      }
      setMemories(payload.memories ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }, [coupleId])

  const mapMarkers = useMemo<MarkerItem[]>(() => {
    return memories
      .filter((memory) => memory.latitude !== null && memory.longitude !== null)
      .map((memory) => ({
        id: memory.id,
        title: memory.title,
        date: memory.memory_date,
        latitude: memory.latitude as number,
        longitude: memory.longitude as number,
        photoUrl: memory.photos?.[0]?.storage_path
          ? photoUrl(memory.photos[0].storage_path)
          : null,
      }))
  }, [memories])

  async function handleFileChange(file: File) {
    setSelectedFile(file)

    try {
      const metadata = await exifr.parse(file, {
        gps: true,
        exif: true,
      })

      if (metadata?.latitude && metadata?.longitude) {
        setLatitude(String(metadata.latitude))
        setLongitude(String(metadata.longitude))
      }

      const date =
        metadata?.DateTimeOriginal ??
        metadata?.CreateDate ??
        metadata?.ModifyDate ??
        null
      if (date instanceof Date) {
        setTakenAt(date.toISOString().slice(0, 16))
      }
    } catch {
      // EXIF parse fail is non-blocking.
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError("업로드할 사진을 선택해 주세요.")
      return
    }
    if (!coupleId.trim()) {
      setError("coupleId가 필요합니다.")
      return
    }

    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("coupleId", coupleId)
      formData.append("caption", caption)
      formData.append("locationName", locationName)
      if (latitude.trim()) formData.append("latitude", latitude.trim())
      if (longitude.trim()) formData.append("longitude", longitude.trim())
      if (takenAt.trim()) formData.append("takenAt", new Date(takenAt).toISOString())

      const response = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? "사진 업로드에 실패했습니다.")
      }

      setCaption("")
      setLocationName("")
      setLatitude("")
      setLongitude("")
      setTakenAt("")
      setSelectedFile(null)
      await loadMemories()
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.")
    } finally {
      setUploading(false)
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>US LOG</CardTitle>
              <Button variant="outline" onClick={() => void handleLogout()}>
                로그아웃
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-zinc-600">
              사진 업로드 시 자동으로 타임라인을 생성하고, 위치 정보가 있으면 지도에 핀으로
              표시됩니다.
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="w-full rounded-md border p-2"
                placeholder="Couple ID (UUID)"
                value={coupleId}
                onChange={(e) => setCoupleId(e.target.value)}
              />
              <Button onClick={loadMemories} disabled={loading}>
                {loading ? "불러오는 중..." : "기록 불러오기"}
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                type="file"
                accept="image/*"
                className="w-full rounded-md border p-2"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFileChange(file)
                }}
              />
              <input
                className="w-full rounded-md border p-2"
                placeholder="한 줄 메모 (caption)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              <input
                className="w-full rounded-md border p-2"
                placeholder="장소 이름 (선택)"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
              <input
                type="datetime-local"
                className="w-full rounded-md border p-2"
                value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
              />
              <input
                className="w-full rounded-md border p-2"
                placeholder="위도 latitude (선택)"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
              <input
                className="w-full rounded-md border p-2"
                placeholder="경도 longitude (선택)"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? "업로드 중..." : "사진 업로드 + 타임라인 생성"}
            </Button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>지도</CardTitle>
          </CardHeader>
          <CardContent>
            {mapMarkers.length > 0 ? (
              <MemoriesMap markers={mapMarkers} />
            ) : (
              <p className="text-sm text-zinc-600">
                아직 지도에 표시할 위치 정보가 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>타임라인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {memories.length === 0 ? (
              <p className="text-sm text-zinc-600">아직 추억 기록이 없습니다.</p>
            ) : null}

            {memories.map((memory) => (
              <div key={memory.id} className="rounded-lg border p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{memory.title}</h3>
                  <Badge variant="secondary">{memory.memory_date}</Badge>
                  {memory.location_name ? (
                    <Badge variant="outline">{memory.location_name}</Badge>
                  ) : null}
                </div>
                <p className="mb-3 text-sm text-zinc-700">{memory.summary}</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {memory.photos?.map((photo) => (
                    <div key={photo.id} className="overflow-hidden rounded-lg border bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl(photo.storage_path)}
                        alt={photo.caption ?? memory.title}
                        className="aspect-square w-full object-cover"
                      />
                      <div className="space-y-1 p-3 text-sm">
                        <p className="font-medium text-zinc-800">
                          {photo.caption || "사진 설명 없음"}
                        </p>
                        <p className="text-zinc-500">
                          {photo.taken_at
                            ? new Date(photo.taken_at).toLocaleString("ko-KR")
                            : "시간 정보 없음"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
