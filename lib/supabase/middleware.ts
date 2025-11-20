import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_VITE_PUBLIC_SUPABASE_URL

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_VITE_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
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
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // If there's a refresh token error, clear the auth cookies
    if (error) {
      if (error.message?.includes("refresh_token_already_used") || error.code === "refresh_token_already_used") {
        // Clear all auth cookies to force re-authentication
        supabaseResponse.cookies.delete("sb-access-token")
        supabaseResponse.cookies.delete("sb-refresh-token")

        // Log the error but don't crash
        console.error("[v0] [Middleware] Refresh token error - clearing cookies:", error.message)
      }
      // Don't throw - just continue with no user
      return supabaseResponse
    }

    // If user is authenticated and visiting the landing page, redirect to studio
    if (user && request.nextUrl.pathname === "/") {
      const studioUrl = new URL("/studio", request.url)
      return NextResponse.redirect(studioUrl)
    }
  } catch (error) {
    // Catch any unexpected errors
    console.error("[v0] [Middleware] Unexpected auth error:", error)
  }

  return supabaseResponse
}
