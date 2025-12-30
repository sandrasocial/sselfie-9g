import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_VITE_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY

  console.log("[v0] Browser Supabase env check:", {
    url: supabaseUrl ? `✓ ${supabaseUrl.substring(0, 30)}...` : "✗ Missing",
    key: supabaseAnonKey ? "✓ Set" : "✗ Missing",
    allEnvKeys: Object.keys(process.env).filter((k) => k.includes("SUPABASE")),
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] ❌ Missing Supabase environment variables")
    console.error("[v0] Available env vars:", Object.keys(process.env))
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
