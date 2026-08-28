import { createBrowserClient } from "@supabase/ssr"
import { DEBUG_LOGS } from "@/lib/debug"
import { analyticsBrowserGeneration } from "@/lib/analytics/client"

const SUPABASE_SESSION_GENERATION_COOKIE = "sselfie_supabase_session_generation"
let pendingRefreshGeneration: string | null = null
let generationTrackingInstalled = false

function isRefreshTokenRequest(input: RequestInfo | URL): boolean {
  try {
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    const baseUrl = typeof window === "undefined" ? undefined : window.location.origin
    const url = new URL(rawUrl, baseUrl)
    return (
      url.pathname.endsWith("/auth/v1/token") &&
      url.searchParams.get("grant_type") === "refresh_token"
    )
  } catch {
    return false
  }
}

async function generationAwareFetch(input: RequestInfo | URL, init?: RequestInit) {
  if (!isRefreshTokenRequest(input)) return globalThis.fetch(input, init)

  const requestGeneration = analyticsBrowserGeneration()
  pendingRefreshGeneration = null
  const response = await globalThis.fetch(input, init)
  if (response.ok) pendingRefreshGeneration = requestGeneration
  return response
}

function writeSupabaseSessionGeneration(generation: string | null): void {
  if (!generation || typeof window === "undefined") return
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${SUPABASE_SESSION_GENERATION_COOKIE}=${generation}; Path=/; SameSite=Lax; Max-Age=31536000${secure}`
}

export function createClient() {
  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_VITE_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL
  )?.trim()

  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_VITE_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY
  )?.trim()

  if (DEBUG_LOGS) {
    console.log("[v0] Supabase env present:", {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
    })
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] ❌ Missing Supabase environment variables")
    throw new Error("Missing Supabase environment variables. Please check your configuration.")
  }

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: generationAwareFetch },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  })

  if (!generationTrackingInstalled && typeof window !== "undefined") {
    generationTrackingInstalled = true
    client.auth.onAuthStateChange(event => {
      if (event === "TOKEN_REFRESHED") {
        writeSupabaseSessionGeneration(pendingRefreshGeneration)
        pendingRefreshGeneration = null
      } else if (event === "SIGNED_IN") {
        writeSupabaseSessionGeneration(analyticsBrowserGeneration())
      }
    })
  }

  return client
}
