import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  // Trim whitespace from env vars (handles trailing spaces in .env.local)
  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.SUPABASE_URL || 
    process.env.SUPABASE_VITE_PUBLIC_SUPABASE_URL
  )?.trim()

  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_VITE_PUBLIC_SUPABASE_ANON_KEY
  )?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    // In development, provide a more helpful error message
    if (process.env.NODE_ENV === 'development') {
      console.warn("[v0] [DEV] Missing Supabase environment variables. Homepage will show landing page without auth.")
      console.warn("[v0] [DEV] Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local")
    }
    throw new Error(
      "Missing Supabase environment variables. Please check your Supabase integration in the Connect section.",
    )
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}

export { createClient as createServerClient }
