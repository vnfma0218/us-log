import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { HomePage } from "@/components/home-page"
import {
  getAccessTokenCookieName,
  getSupabaseAuthClient,
} from "@/lib/supabase-auth"

export default async function Page() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(getAccessTokenCookieName())?.value

  if (!accessToken) {
    redirect("/login")
  }

  const supabase = getSupabaseAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken)

  if (!user) {
    redirect("/login")
  }

  return <HomePage />
}
