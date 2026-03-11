export type PhotoItem = {
  id: string
  storage_path: string
  caption: string | null
  taken_at: string
  location_name: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
}

export type MemoryItem = {
  id: string
  title: string
  summary: string
  memory_date: string
  location_name: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  photos: PhotoItem[]
}

export type MarkerItem = {
  id: string
  title: string
  date: string
  latitude: number
  longitude: number
  photoUrl: string | null
}

export type VideoJobItem = {
  id: string
  memory_id: string | null
  status: "queued" | "processing" | "done" | "failed"
  style: string
  duration_sec: number
  bgm: string | null
  progress: number
  error_message: string | null
  result_path: string | null
  thumbnail_path: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}
