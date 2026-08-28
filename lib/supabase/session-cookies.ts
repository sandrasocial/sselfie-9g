import type { NextRequest, NextResponse } from "next/server"

export function isSupabaseSessionCookie(name: string): boolean {
  return (
    name === "sb-access-token" ||
    name === "sb-refresh-token" ||
    /^sb-.+-auth-token(?:\.\d+)?$/.test(name)
  )
}

export function clearSupabaseSessionCookies(response: NextResponse, request?: NextRequest): void {
  for (const cookie of request?.cookies.getAll() ?? []) {
    if (!isSupabaseSessionCookie(cookie.name)) continue
    response.cookies.set(cookie.name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })
  }
}
