import { AppShell } from "@/components/app-shell"
import { VideosPage } from "@/components/videos-page"
import { requireAuth } from "@/lib/require-auth"

export default async function VideosRoutePage() {
  await requireAuth()

  return (
    <AppShell>
      <VideosPage />
    </AppShell>
  )
}
