import { createClient } from "@/lib/supabase/server"
import { syncUserWithNeon } from "@/lib/user-sync"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      console.log("[v0] Auth callback - syncing user with Neon")

      // Sync the authenticated user with Neon database
      await syncUserWithNeon(data.user.id, data.user.email!, data.user.user_metadata?.name)
    }
  }

  // Redirect to home page
  return NextResponse.redirect(`${origin}/`)
}
