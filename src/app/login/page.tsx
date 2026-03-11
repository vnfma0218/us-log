"use client";

import { SubmitEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "로그인에 실패했습니다.");
      }

      const nextPath = new URLSearchParams(window.location.search).get("next");
      router.replace(nextPath && nextPath.startsWith("/") ? nextPath : "/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fef3c7,_#fff7ed_45%,_#ffffff_75%)] px-4 py-10">
      <Card className="w-full max-w-md border-amber-200/70 bg-white/90 shadow-xl backdrop-blur">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">US LOG 로그인</CardTitle>
          <CardDescription>
            로그인되어 있지 않으면 메인 페이지에 접근할 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              Email
              <input
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                placeholder="이메일 입력"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              Password
              <input
                type="password"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="비밀번호 입력"
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
