"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", label: "사진 목록" },
  { href: "/map", label: "지도" },
  { href: "/videos", label: "영상 생성" },
]

function navClassName(isActive: boolean) {
  return isActive
    ? "rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
    : "rounded-full px-4 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
}

export function AppHeader() {
  const pathname = usePathname()

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-[0.24em] text-zinc-950">
          US LOG
        </Link>
        <nav className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 p-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navClassName(pathname === item.href)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Button variant="outline" onClick={() => void handleLogout()}>
          로그아웃
        </Button>
      </div>
    </header>
  )
}
