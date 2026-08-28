import type { NextRequest, NextResponse } from "next/server"

const SUPABASE_SESSION_GENERATION_COOKIE = "sselfie_supabase_session_generation"

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
}

const sessionGenerationCookieOptions = {
  ...sessionCookieOptions,
  // Browser-owned Supabase refreshes must be able to replace this marker with
  // the generation captured when their token request began.
  httpOnly: false,
}

export function isSupabaseSessionCookie(name: string): boolean {
  return (
    name === "sb-access-token" ||
    name === "sb-refresh-token" ||
    /^sb-.+-auth-token(?:\.\d+)?$/.test(name)
  )
}

export function supabaseSessionGenerationFromRequest(request?: NextRequest): string | null {
  return request?.cookies.get(SUPABASE_SESSION_GENERATION_COOKIE)?.value || null
}

export function markSupabaseSessionGeneration(
  response: NextResponse,
  generation?: string | null
): void {
  if (!generation) return
  response.cookies.set(SUPABASE_SESSION_GENERATION_COOKIE, generation, {
    ...sessionGenerationCookieOptions,
    maxAge: 60 * 60 * 24 * 365,
  })
}

export function clearSupabaseSessionCookieNames(
  response: NextResponse,
  cookieNames: readonly string[]
): void {
  for (const name of cookieNames) {
    if (!isSupabaseSessionCookie(name)) continue
    response.cookies.set(name, "", {
      ...sessionCookieOptions,
      maxAge: 0,
    })
  }
}

export function clearSupabaseSessionCookies(response: NextResponse, request?: NextRequest): void {
  clearSupabaseSessionCookieNames(
    response,
    (request?.cookies.getAll() ?? []).map(cookie => cookie.name)
  )
}
