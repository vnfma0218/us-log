import { createClient } from "@supabase/supabase-js"

const ACCESS_TOKEN_COOKIE_NAME = "sb-access-token"
const REFRESH_TOKEN_COOKIE_NAME = "sb-refresh-token"

function getSupabaseAuthKey() {
  const authKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!authKey) {
    throw new Error(
      "Missing Supabase auth key: NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or SUPABASE_SERVICE_ROLE_KEY is required."
    )
  }

  return authKey
}

export function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl) {
    throw new Error("Missing Supabase env var: NEXT_PUBLIC_SUPABASE_URL is required.")
  }

  return createClient(supabaseUrl, getSupabaseAuthKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function getAccessTokenCookieName() {
  return ACCESS_TOKEN_COOKIE_NAME
}

export function getRefreshTokenCookieName() {
  return REFRESH_TOKEN_COOKIE_NAME
}
