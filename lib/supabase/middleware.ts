import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

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
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      if (error.message?.includes("refresh_token_already_used") || error.code === "refresh_token_already_used") {
        console.log("[v0] [Middleware] Refresh token error - clearing cookies")
        supabaseResponse.cookies.delete("sb-access-token")
        supabaseResponse.cookies.delete("sb-refresh-token")
      } else {
        console.log("[v0] [Middleware] Auth error:", error.message || "Auth session missing!")
      }
      return supabaseResponse
    }

    if (user) {
      console.log("[v0] [Middleware] Authenticated:", user.email)
    }

    // If user is authenticated and visiting the landing page, redirect to studio
    if (user && request.nextUrl.pathname === "/") {
      const studioUrl = new URL("/studio", request.url)
      return NextResponse.redirect(studioUrl)
    }
  } catch (error) {
    console.log("[v0] [Middleware] Auth check failed:", error)
  }

  return supabaseResponse
}
