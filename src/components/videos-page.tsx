"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MemoryItem, VideoJobItem } from "@/lib/types"

const jobStatusLabel: Record<VideoJobItem["status"], string> = {
  queued: "대기중",
  processing: "처리중",
  done: "완료",
  failed: "실패",
}

export function VideosPage() {
  const searchParams = useSearchParams()
  const preselectedMemoryId = searchParams.get("memoryId") ?? ""

  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [jobs, setJobs] = useState<VideoJobItem[]>([])
  const [memoryId, setMemoryId] = useState(preselectedMemoryId)
  const [durationSec, setDurationSec] = useState(30)
  const [bgm, setBgm] = useState("")
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const selectedMemory = useMemo(
    () => memories.find((memory) => memory.id === memoryId) ?? null,
    [memories, memoryId]
  )

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [memoriesRes, jobsRes] = await Promise.all([
        fetch("/api/memories"),
        fetch("/api/videos/jobs"),
      ])
      const memoriesPayload = await memoriesRes.json()
      const jobsPayload = await jobsRes.json()

      if (!memoriesRes.ok) {
        throw new Error(memoriesPayload.error ?? "추억 목록을 불러오지 못했습니다.")
      }
      if (!jobsRes.ok) {
        throw new Error(jobsPayload.error ?? "영상 작업 목록을 불러오지 못했습니다.")
      }

      setMemories(memoriesPayload.memories ?? [])
      setJobs(jobsPayload.jobs ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!preselectedMemoryId) return
    setMemoryId(preselectedMemoryId)
  }, [preselectedMemoryId])

  async function handleCreateJob() {
    if (!memoryId) {
      setError("영상으로 만들 추억을 선택해 주세요.")
      return
    }

    setCreating(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch("/api/videos/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memoryId,
          durationSec,
          style: "slideshow",
          bgm: bgm.trim() || null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "영상 작업 생성에 실패했습니다.")
      }

      setSuccess("영상 작업을 생성했습니다. 워커가 처리하면 완료 상태로 바뀝니다.")
      setJobs((current) => [payload.job, ...current])
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.")
    } finally {
      setCreating(false)
    }
  }

  async function handleCancelJob(jobId: string) {
    const ok = window.confirm("이 작업을 취소할까요?")
    if (!ok) return

    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/videos/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "작업 취소에 실패했습니다.")
      }
      setJobs((current) => current.map((job) => (job.id === jobId ? payload.job : job)))
      setSuccess("작업을 취소했습니다.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.")
    }
  }

  async function handleDeleteJob(jobId: string) {
    const ok = window.confirm("이 작업을 삭제할까요?")
    if (!ok) return

    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/videos/jobs/${jobId}`, {
        method: "DELETE",
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "작업 삭제에 실패했습니다.")
      }
      setJobs((current) => current.filter((job) => job.id !== jobId))
      setSuccess("작업을 삭제했습니다.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.")
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
      <Card className="border-zinc-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>영상 생성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-600">
            추억 하나를 선택해서 슬라이드쇼 영상 작업을 큐에 추가합니다.
          </p>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-700">추억 선택</label>
            <select
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
              value={memoryId}
              onChange={(event) => setMemoryId(event.target.value)}
            >
              <option value="">추억을 선택해 주세요</option>
              {memories.map((memory) => (
                <option key={memory.id} value={memory.id}>
                  {memory.memory_date} - {memory.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-700">영상 길이(초)</label>
            <input
              type="number"
              min={5}
              max={120}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
              value={durationSec}
              onChange={(event) => setDurationSec(Number(event.target.value) || 30)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-700">BGM 키(선택)</label>
            <input
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
              placeholder="romantic-piano"
              value={bgm}
              onChange={(event) => setBgm(event.target.value)}
            />
          </div>

          {selectedMemory ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              선택됨: <span className="font-medium">{selectedMemory.title}</span> (
              {selectedMemory.photos.length}장)
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

          <div className="flex items-center gap-2">
            <Button onClick={handleCreateJob} disabled={creating}>
              {creating ? "작업 생성 중..." : "영상 작업 생성"}
            </Button>
            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
              새로고침
            </Button>
            <Link href="/">
              <Button variant="ghost">추억 목록으로</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>영상 작업 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-zinc-500">불러오는 중...</p> : null}
          {!loading && jobs.length === 0 ? (
            <p className="text-sm text-zinc-500">아직 영상 작업이 없습니다.</p>
          ) : null}
          {jobs.map((job) => (
            <div key={job.id} className="rounded-xl border border-zinc-200 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary">{jobStatusLabel[job.status]}</Badge>
                <span className="text-xs text-zinc-500">
                  {new Date(job.created_at).toLocaleString("ko-KR")}
                </span>
              </div>
              <p className="text-sm text-zinc-700">job_id: {job.id}</p>
              <p className="text-sm text-zinc-700">duration: {job.duration_sec}s</p>
              <p className="text-sm text-zinc-700">progress: {job.progress}%</p>
              {job.error_message ? (
                <p className="mt-1 text-sm text-red-600">{job.error_message}</p>
              ) : null}
              {job.result_path ? (
                <a
                  className="mt-2 inline-block text-sm text-blue-600 underline"
                  href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/videos/${job.result_path}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  결과 영상 보기
                </a>
              ) : null}
              <div className="mt-3 flex items-center gap-2">
                {job.status === "queued" || job.status === "processing" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCancelJob(job.id)}
                  >
                    취소
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => void handleDeleteJob(job.id)}>
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
