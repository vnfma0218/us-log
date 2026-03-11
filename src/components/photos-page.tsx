"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPhotoUrl } from "@/lib/photos";
import type { MemoryItem } from "@/lib/types";

type PreviewItem = {
  file: File;
  id: string;
  url: string;
  failed: boolean;
};

export function PhotosPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const previewsRef = useRef<PreviewItem[]>([]);

  async function loadMemories() {
    setLoading(true);
    try {
      const response = await fetch("/api/memories");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "추억 목록을 불러오지 못했습니다.");
      }

      setMemories(payload.memories ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    void loadMemories();
  }, []);

  useEffect(() => {
    return () => {
      for (const preview of previewsRef.current) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, []);

  function handleFilesChange(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const selectedFiles = Array.from(files);

    setSuccess(null);
    setError(null);
    setPreviews((current) => {
      const nextItems = selectedFiles.map((file) => ({
        file,
        id: `${file.name}-${file.lastModified}-${
          globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
        }`,
        url: URL.createObjectURL(file),
        failed: false,
      }));

      return [...current, ...nextItems];
    });
  }

  function handleRemovePreview(id: string) {
    setPreviews((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  function handlePreviewLoadError(id: string) {
    setPreviews((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        return { ...item, failed: true };
      })
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (!content.trim()) {
      setError("내용을 입력해 주세요.");
      return;
    }
    if (previews.length === 0) {
      setError("사진을 한 장 이상 선택해 주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("summary", content.trim());

      for (const preview of previews) {
        formData.append("files", preview.file);
      }

      const response = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "추억 저장에 실패했습니다.");
      }

      setTitle("");
      setContent("");
      setPreviews((current) => {
        for (const preview of current) {
          URL.revokeObjectURL(preview.url);
        }
        return [];
      });
      setSuccess(
        `${payload.uploadedCount ?? previews.length}장의 사진을 저장했습니다.`
      );
      await loadMemories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <Card className="overflow-hidden border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100 bg-[linear-gradient(135deg,#fff8eb_0%,#ffffff_58%)]">
          <div className="space-y-2">
            <Badge
              variant="outline"
              className="w-fit border-orange-200 bg-orange-50 text-orange-700"
            >
              Photo Memory
            </Badge>
            <CardTitle className="text-2xl">추억 저장</CardTitle>
            <p className="text-sm text-zinc-600">
              제목과 내용을 적고 사진을 여러 장 올리면 하나의 추억으로
              저장됩니다.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-zinc-700">제목</span>
              <input
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="오늘의 추억 제목"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-zinc-700">내용</span>
              <textarea
                className="min-h-36 rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="오늘 어떤 순간을 남기고 싶은지 적어주세요."
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </label>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-zinc-700">
                  사진 목록
                </span>
                <span className="text-xs text-zinc-500">여러 장 선택 가능</span>
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center transition hover:border-orange-300 hover:bg-orange-50/50">
                <div className="space-y-1">
                  <p className="font-medium text-zinc-800">사진 업로드</p>
                  <p className="text-sm text-zinc-500">
                    클릭해서 여러 장을 선택하거나 파일을 추가하세요.
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    handleFilesChange(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>

              {previews.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {previews.map((preview) => (
                    <div
                      key={preview.id}
                      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                    >
                      {!preview.failed ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={preview.url}
                            alt={preview.file.name}
                            className="aspect-[4/3] w-full object-cover"
                            onError={() => handlePreviewLoadError(preview.id)}
                          />
                        </>
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center bg-zinc-100 px-3 text-center text-xs text-zinc-600">
                          미리보기를 지원하지 않는 형식일 수 있습니다 (예:
                          HEIC/HEIF).
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-800">
                            {preview.file.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {(preview.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemovePreview(preview.id)}
                        >
                          제거
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  선택된 사진이 아직 없습니다.
                </p>
              )}
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {success ? (
              <p className="text-sm text-emerald-600">{success}</p>
            ) : null}

            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "저장 중..." : "추억 저장하기"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>최근 추억</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-zinc-500">불러오는 중...</p>
          ) : null}
          {!loading && memories.length === 0 ? (
            <p className="text-sm text-zinc-500">
              아직 저장된 추억이 없습니다.
            </p>
          ) : null}
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="rounded-2xl border border-zinc-200 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <h3 className="font-semibold text-zinc-900">{memory.title}</h3>
                <Badge variant="secondary">{memory.memory_date}</Badge>
                <Link href={`/videos?memoryId=${encodeURIComponent(memory.id)}`}>
                  <Button size="sm" variant="outline">
                    영상 만들기
                  </Button>
                </Link>
              </div>
              <p className="mb-3 text-sm text-zinc-600">{memory.summary}</p>
              <div className="grid grid-cols-3 gap-2">
                {memory.photos.slice(0, 3).map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photo.id}
                    src={getPhotoUrl(photo.storage_path)}
                    alt={photo.caption ?? memory.title}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
