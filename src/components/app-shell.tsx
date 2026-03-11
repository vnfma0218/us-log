import type { ReactNode } from "react"

import { AppHeader } from "@/components/app-header"

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">{children}</main>
    </div>
  )
}
