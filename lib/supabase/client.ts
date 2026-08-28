import { createBrowserClient } from "@supabase/ssr"
import { DEBUG_LOGS } from "@/lib/debug"
import { analyticsBrowserGeneration } from "@/lib/analytics/client"

const SUPABASE_SESSION_GENERATION_COOKIE = "sselfie_supabase_session_generation"
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

function browserCookieValue(name: string): string | null {
  if (typeof window === "undefined") return null
  return (
    document.cookie
      .split(";")
      .map(value => value.trim())
      .find(value => value.startsWith(`${name}=`))
      ?.slice(name.length + 1) || null
  )
}

function supabaseSessionGenerationFromBrowser(): string | null {
  return browserCookieValue(SUPABASE_SESSION_GENERATION_COOKIE) || analyticsBrowserGeneration()
}

async function isSessionBearingRefreshResponse(response: Response): Promise<boolean> {
  if (!response.ok) return false
  try {
    const payload = await response.clone().json()
    return (
      typeof payload?.access_token === "string" &&
      payload.access_token.length > 0 &&
      typeof payload?.refresh_token === "string" &&
      payload.refresh_token.length > 0 &&
      typeof payload?.expires_in === "number" &&
      payload.expires_in > 0
    )
  } catch {
    return false
  }
}

async function generationAwareFetch(input: RequestInfo | URL, init?: RequestInit) {
  if (!isRefreshTokenRequest(input)) return globalThis.fetch(input, init)

  // The auth session marker, not the independently rotating analytics cookie,
  // identifies which generation owns an in-flight refresh.
  const requestGeneration = supabaseSessionGenerationFromBrowser()
  const response = await globalThis.fetch(input, init)
  // Supabase persists the refreshed session before emitting TOKEN_REFRESHED.
  // Write the request generation before returning the response so no browser
  // request can expose the refreshed cookies with a newer logout generation.
  if (await isSessionBearingRefreshResponse(response)) {
    writeSupabaseSessionGeneration(requestGeneration)
  }
  return response
}

function writeSupabaseSessionGeneration(generation: string | null): void {
  if (!generation || typeof window === "undefined") return
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${SUPABASE_SESSION_GENERATION_COOKIE}=${generation}; Path=/; SameSite=Lax; Max-Age=31536000${secure}`
}

export function bindCurrentSupabaseSessionGeneration(): void {
  if (browserCookieValue(SUPABASE_SESSION_GENERATION_COOKIE)) return
  writeSupabaseSessionGeneration(analyticsBrowserGeneration())
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
      if (event === "SIGNED_IN") {
        // Supabase also emits SIGNED_IN when recovering an existing stored
        // session. Preserve its marker instead of attaching a newer logout
        // generation; only an untagged genuine sign-in needs a new marker.
        bindCurrentSupabaseSessionGeneration()
      }
    })
  }

  return client
}
