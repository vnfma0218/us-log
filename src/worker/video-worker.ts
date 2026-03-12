import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

import { createServiceClient } from "@/lib/supabase-service";

const execFileAsync = promisify(execFile);
const MAX_PHOTOS = 30;
const REMOTION_FPS = 30;
const REMOTION_COMPOSITION_ID = "MemorySlideshow";

let bundledServeUrlPromise: Promise<string> | null = null;

type VideoJob = {
  id: string;
  couple_id: string;
  requested_by: string;
  memory_id: string | null;
  duration_sec: number;
};

async function ensureFfmpeg() {
  await execFileAsync("ffmpeg", ["-version"]);
}

async function getRemotionServeUrl() {
  if (!bundledServeUrlPromise) {
    bundledServeUrlPromise = bundle({
      entryPoint: resolve(process.cwd(), "src/remotion/index.ts"),
    });
  }
  return bundledServeUrlPromise;
}

async function updateJobProgress(jobId: string, progress: number) {
  const supabase = createServiceClient();
  await supabase
    .from("video_jobs")
    .update({ progress })
    .eq("id", jobId)
    .eq("status", "processing");
}

async function assertJobIsProcessing(jobId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("video_jobs")
    .select("status")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("job not found");
  }
  if (data.status !== "processing") {
    throw new Error("job canceled");
  }
}

async function pickQueuedJob(): Promise<VideoJob | null> {
  const supabase = createServiceClient();
  const { data: candidate, error: fetchError } = await supabase
    .from("video_jobs")
    .select("id,couple_id,requested_by,memory_id,duration_sec")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!candidate) return null;

  const { data: locked, error: lockError } = await supabase
    .from("video_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      progress: 5,
      error_message: null,
    })
    .eq("id", candidate.id)
    .eq("status", "queued")
    .select("id,couple_id,requested_by,memory_id,duration_sec")
    .maybeSingle();

  if (lockError) {
    throw new Error(lockError.message);
  }

  return locked ?? null;
}

async function fetchMemoryPhotos(job: VideoJob) {
  const supabase = createServiceClient();

  let title = "우리의 추억 영상";
  if (job.memory_id) {
    const { data: memory } = await supabase
      .from("memories")
      .select("title")
      .eq("id", job.memory_id)
      .eq("couple_id", job.couple_id)
      .maybeSingle();
    if (memory?.title) {
      title = `${memory.title} 영상`;
    }
  }

  let query = supabase
    .from("photos")
    .select("id,storage_path,taken_at")
    .eq("couple_id", job.couple_id);

  if (job.memory_id) {
    query = query.eq("memory_id", job.memory_id);
  }

  const { data: photos, error } = await query
    .order("taken_at", { ascending: true })
    .limit(MAX_PHOTOS);

  if (error) {
    throw new Error(error.message);
  }
  if (!photos || photos.length === 0) {
    throw new Error("영상 생성에 사용할 사진이 없습니다.");
  }

  return { title, photos };
}

async function downloadPhoto(storagePath: string, outputPath: string) {
  const supabase = createServiceClient();
  const { data: signed, error: signError } = await supabase.storage
    .from("photos")
    .createSignedUrl(storagePath, 60 * 10);

  if (signError || !signed?.signedUrl) {
    throw new Error(signError?.message ?? "signed url creation failed");
  }

  const response = await fetch(signed.signedUrl);
  if (!response.ok) {
    throw new Error(`failed to download photo: ${storagePath}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(outputPath, bytes);
}

async function normalizeToJpeg(inputPath: string, outputPath: string) {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    outputPath,
  ]);
}

async function jpgFileToDataUrl(filePath: string) {
  const bytes = await readFile(filePath);
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}

async function renderSlideshow({
  files,
  durationSec,
  outputMp4Path,
  outputThumbPath,
}: {
  files: string[];
  durationSec: number;
  outputMp4Path: string;
  outputThumbPath: string;
}) {
  if (files.length === 0) {
    throw new Error("영상 생성에 사용할 파일이 없습니다.");
  }

  const serveUrl = await getRemotionServeUrl();
  const images = await Promise.all(files.map((file) => jpgFileToDataUrl(file)));
  const inputProps = {
    images,
    durationSec,
  };
  const composition = await selectComposition({
    serveUrl,
    id: REMOTION_COMPOSITION_ID,
    inputProps,
  });

  await renderMedia({
    serveUrl,
    composition: {
      ...composition,
      durationInFrames: Math.max(1, Math.round(durationSec * REMOTION_FPS)),
      fps: REMOTION_FPS,
    },
    inputProps,
    codec: "h264",
    outputLocation: outputMp4Path,
    imageFormat: "jpeg",
    pixelFormat: "yuv420p",
    overwrite: true,
  });

  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    outputMp4Path,
    "-ss",
    "00:00:01",
    "-vframes",
    "1",
    outputThumbPath,
  ]);
}

async function uploadVideoArtifacts({
  coupleId,
  jobId,
  requestedBy,
  title,
  durationSec,
  mp4Path,
  thumbnailPath,
}: {
  coupleId: string;
  jobId: string;
  requestedBy: string;
  title: string;
  durationSec: number;
  mp4Path: string;
  thumbnailPath: string;
}) {
  const supabase = createServiceClient();
  const resultPath = `${coupleId}/${jobId}/final.mp4`;
  const thumbPath = `${coupleId}/${jobId}/thumbnail.jpg`;
  const videoBuffer = await readFile(mp4Path);
  const thumbBuffer = await readFile(thumbnailPath);

  const { error: videoUploadError } = await supabase.storage
    .from("videos")
    .upload(resultPath, videoBuffer, {
      contentType: "video/mp4",
      upsert: true,
      cacheControl: "3600",
    });

  if (videoUploadError) {
    throw new Error(videoUploadError.message);
  }

  const { error: thumbUploadError } = await supabase.storage
    .from("videos")
    .upload(thumbPath, thumbBuffer, {
      contentType: "image/jpeg",
      upsert: true,
      cacheControl: "3600",
    });

  if (thumbUploadError) {
    throw new Error(thumbUploadError.message);
  }

  const { error: videoRowError } = await supabase.from("videos").upsert(
    {
      couple_id: coupleId,
      job_id: jobId,
      title,
      storage_path: resultPath,
      thumbnail_path: thumbPath,
      duration_sec: durationSec,
      created_by: requestedBy,
    },
    { onConflict: "job_id" }
  );

  if (videoRowError) {
    throw new Error(videoRowError.message);
  }

  const { error: jobUpdateError } = await supabase
    .from("video_jobs")
    .update({
      status: "done",
      progress: 100,
      result_path: resultPath,
      thumbnail_path: thumbPath,
      finished_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", jobId);

  if (jobUpdateError) {
    throw new Error(jobUpdateError.message);
  }
}

async function failJob(jobId: string, errorMessage: string) {
  const supabase = createServiceClient();
  await supabase
    .from("video_jobs")
    .update({
      status: "failed",
      error_message: errorMessage.slice(0, 1200),
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function processSingleJob(job: VideoJob) {
  const tempDir = await mkdtemp(join(tmpdir(), "us-log-video-"));

  try {
    await assertJobIsProcessing(job.id);
    const { title, photos } = await fetchMemoryPhotos(job);
    await updateJobProgress(job.id, 20);

    const localFiles: string[] = [];
    for (let index = 0; index < photos.length; index += 1) {
      await assertJobIsProcessing(job.id);
      const photo = photos[index];
      const rawPath = join(
        tempDir,
        `raw-${String(index + 1).padStart(3, "0")}.bin`
      );
      const normalizedPath = join(
        tempDir,
        `${String(index + 1).padStart(3, "0")}.jpg`
      );
      await downloadPhoto(photo.storage_path, rawPath);
      await normalizeToJpeg(rawPath, normalizedPath);
      localFiles.push(normalizedPath);
    }

    await assertJobIsProcessing(job.id);
    await updateJobProgress(job.id, 55);

    const outputMp4Path = join(tempDir, "final.mp4");
    const outputThumbPath = join(tempDir, "thumbnail.jpg");
    await renderSlideshow({
      files: localFiles,
      durationSec: job.duration_sec,
      outputMp4Path,
      outputThumbPath,
    });

    await assertJobIsProcessing(job.id);
    await updateJobProgress(job.id, 85);

    await uploadVideoArtifacts({
      coupleId: job.couple_id,
      jobId: job.id,
      requestedBy: job.requested_by,
      title,
      durationSec: job.duration_sec,
      mp4Path: outputMp4Path,
      thumbnailPath: outputThumbPath,
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function workOnce() {
  const job = await pickQueuedJob();
  if (!job) {
    return false;
  }

  console.log(`[video-worker] picked job ${job.id}`);
  try {
    await processSingleJob(job);
    console.log(`[video-worker] completed job ${job.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown worker error";
    console.error(`[video-worker] failed job ${job.id}: ${message}`);
    if (message !== "job canceled") {
      await failJob(job.id, message);
    }
  }
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const once = args.includes("--once");
  const intervalIndex = args.findIndex((arg) => arg === "--interval");
  const intervalSec =
    intervalIndex >= 0 && args[intervalIndex + 1]
      ? Math.max(3, Number(args[intervalIndex + 1]) || 10)
      : 10;

  await ensureFfmpeg();

  if (once) {
    await workOnce();
    return;
  }

  while (true) {
    const processed = await workOnce();
    if (!processed) {
      await new Promise((resolve) => setTimeout(resolve, intervalSec * 1000));
    }
  }
}

main().catch((error) => {
  console.error(
    `[video-worker] fatal: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exit(1);
});
