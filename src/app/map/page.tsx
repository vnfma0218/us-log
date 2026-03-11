import { AppShell } from "@/components/app-shell"
import { MapPage } from "@/components/map-page"
import { requireAuth } from "@/lib/require-auth"

export default async function MapRoutePage() {
  await requireAuth()

  return (
    <AppShell>
      <MapPage />
    </AppShell>
  )
}
