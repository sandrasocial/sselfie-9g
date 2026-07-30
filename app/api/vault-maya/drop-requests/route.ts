import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { getSuiteAccess } from "@/lib/trial/suite-trial"

export const dynamic = "force-dynamic"

const MAX_MESSAGE_LENGTH = 2000

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) {
    return NextResponse.json({ error: "Account not found" }, { status: 403 })
  }

  if (!isAdminEmail(user.email)) {
    const access = await getSuiteAccess(String(neonUserId))
    if (access.level !== "vault" && access.level !== "member" && access.level !== "trial") {
      return NextResponse.json({ error: "Vault Maya membership required" }, { status: 403 })
    }
  }

  let message = ""
  let inspoImageUrl: string | null = null
  try {
    const body = await request.json()
    if (typeof body?.message === "string") message = body.message.trim()
    if (typeof body?.inspoImageUrl === "string" && /^https:\/\//.test(body.inspoImageUrl)) {
      inspoImageUrl = body.inspoImageUrl.slice(0, 2048)
    }
  } catch {
    return NextResponse.json({ error: "Expected JSON body with message" }, { status: 400 })
  }

  if (!message) {
    return NextResponse.json({ error: "Tell Maya what you want to see next" }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_LENGTH) message = message.slice(0, MAX_MESSAGE_LENGTH)

  // Simple flood guard: max 10 requests per user per day.
  const recent = await sql`
    SELECT COUNT(*)::int AS n FROM vault_maya_drop_requests
    WHERE user_id = ${String(neonUserId)} AND created_at > NOW() - interval '1 day'
  `
  if (Number(recent[0]?.n || 0) >= 10) {
    return NextResponse.json(
      { error: "That's plenty for today — Sandra has your ideas." },
      { status: 429 },
    )
  }

  await sql`
    INSERT INTO vault_maya_drop_requests (user_id, message, inspo_image_url)
    VALUES (${String(neonUserId)}, ${message}, ${inspoImageUrl})
  `

  return NextResponse.json({ ok: true })
}
