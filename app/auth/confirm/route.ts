import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get("token")
  const type = requestUrl.searchParams.get("type")
  const redirectTo = requestUrl.searchParams.get("redirect_to") || "/studio"

  console.log("[v0] Auth confirm - Token type:", type)

  if (token && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    )

    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as any,
    })

    if (error) {
      console.error("[v0] Auth confirm error:", error)
      return NextResponse.redirect(new URL("/auth/error?error=Invalid or expired link", requestUrl.origin))
    }

    console.log("[v0] Auth confirm successful")

    // This allows users to choose their own password
    return NextResponse.redirect(new URL("/auth/setup-password", requestUrl.origin))
  }

  return NextResponse.redirect(new URL("/auth/error?error=Missing authentication token", requestUrl.origin))
}
