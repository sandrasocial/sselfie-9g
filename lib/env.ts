// Environment variable helper that supports both Next.js and Vite naming conventions
export function getPublicEnvVar(name: string): string | undefined {
  // Try Next.js convention first
  const nextPublicVar = process.env[`NEXT_PUBLIC_${name}`]
  if (nextPublicVar) return nextPublicVar

  // Try Vite convention
  const vitePublicVar = process.env[`SUPABASE_VITE_PUBLIC_${name}`]
  if (vitePublicVar) return vitePublicVar

  // Try without prefix (server-side only)
  return process.env[name]
}

export function getSupabaseEnvVars() {
  const url = getPublicEnvVar("SUPABASE_URL")
  const anonKey = getPublicEnvVar("SUPABASE_ANON_KEY")

  return { url, anonKey }
}
