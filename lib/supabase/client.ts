import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_VITE_PUBLIC_SUPABASE_URL

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_VITE_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Missing Supabase environment variables")
    console.error(
      "[v0] Available env vars:",
      Object.keys(process.env).filter((k) => k.includes("SUPABASE")),
    )
    throw new Error(
      "Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.",
    )
  }

  console.log("[v0] Creating Supabase client with URL:", supabaseUrl?.substring(0, 20) + "...")

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    global: {
      fetch: async (url, options) => {
        try {
          const response = await fetch(url, options)
          return response
        } catch (error) {
          console.error("[v0] Supabase fetch error:", error)
          // Return a mock response to prevent crashes
          return new Response(JSON.stringify({ error: "Network error" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
        }
      },
    },
  })
}
