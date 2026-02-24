import { createBrowserClient } from "@supabase/ssr"
import { DEBUG_LOGS } from "@/lib/debug"

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_VITE_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY

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

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  })
}
