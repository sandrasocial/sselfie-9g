import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import {
  analyticsGenerationFromRequest,
  rotateAnonymousAnalyticsIdentity,
} from "@/lib/analytics/identity-cookies"

const TERMINAL_AUTH_ERROR_CODES = new Set([
  "bad_jwt",
  "refresh_token_already_used",
  "refresh_token_not_found",
  "session_expired",
  "session_not_found",
])

function isSupabaseSessionCookie(name: string): boolean {
  return (
    name === "sb-access-token" ||
    name === "sb-refresh-token" ||
    /^sb-.+-auth-token(?:\.\d+)?$/.test(name)
  )
}

function isTerminalAuthError(error: { code?: string; message?: string }): boolean {
  const code = error.code?.toLowerCase()
  if (code && TERMINAL_AUTH_ERROR_CODES.has(code)) return true
  const message = error.message?.toLowerCase() || ""
  return (
    message.includes("refresh token not found") || message.includes("refresh_token_already_used")
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const sessionCookies = request.cookies
    .getAll()
    .filter(cookie => isSupabaseSessionCookie(cookie.name))

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("[v0] [Middleware] Supabase not configured - skipping auth check")
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          const enhancedOptions = {
            ...options,
            path: options?.path || "/",
            sameSite: (options?.sameSite as "lax" | "strict" | "none" | undefined) || "lax",
            secure: process.env.NODE_ENV === "production" || (options?.secure ?? false),
            domain: options?.domain || undefined,
          }
          supabaseResponse.cookies.set(name, value, enhancedOptions)
        })
      },
    },
  })

  try {
    // Add timeout to prevent hanging on slow/unreachable Supabase
    const authPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Auth check timeout")), 5000)
    )

    const result = await Promise.race([authPromise, timeoutPromise])

    const {
      data: { user },
      error,
    } = result

    if (error) {
      if (sessionCookies.length > 0 && isTerminalAuthError(error)) {
        console.log("[v0] [Middleware] Terminal auth session error - clearing cookies")
        for (const cookie of sessionCookies) supabaseResponse.cookies.delete(cookie.name)
        // Session loss can happen without the explicit logout route. Rotate
        // the anonymous identity and tell the browser provider to reset its
        // persisted user identity before capturing the now-anonymous page.
        rotateAnonymousAnalyticsIdentity(supabaseResponse, analyticsGenerationFromRequest(request))
      } else {
        // Only log for API routes that require auth, not public routes
        if (
          !request.nextUrl.pathname.includes("/api/landing-stats") &&
          !request.nextUrl.pathname.includes("/api/freebie")
        ) {
          console.log("[v0] [Middleware] Auth error:", error.message || "Auth session missing!")
        }
      }
      return supabaseResponse
    }

    if (user) {
      console.log("[v0] [Middleware] Authenticated:", user.email)
    }

    // Note: Redirect logic is handled in app/page.tsx to avoid conflicts
    // and allow for more sophisticated referer-based navigation handling
  } catch (error) {
    console.log("[v0] [Middleware] Auth check failed or timed out:", error)
    // Return response to allow page to load even if auth check fails
    return supabaseResponse
  }

  return supabaseResponse
}
