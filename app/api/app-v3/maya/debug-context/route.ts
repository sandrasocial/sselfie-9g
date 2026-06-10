// SSELFIE Studio 3.0 — brand-context diagnostic (admin-only).
// Lets us SEE exactly what Maya knows about the creator (the validation the reviewer asked
// for: don't build the recommendation engine until "Maya knows me" is proven). Returns the
// raw getUserContextForMaya output + whether it reads as a real profile. Admin-only since it
// exposes brand context.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"

export const dynamic = "force-dynamic"

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const context = await getUserContextForMaya(user.id)
    const text = typeof context === "string" ? context : ""
    return NextResponse.json({
      length: text.length,
      hasBrandProfile: text.trim().length > 200,
      context: text,
    })
  } catch (e) {
    console.error("[app-v3 debug-context] failed:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
