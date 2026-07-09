import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"

// TEMP one-time backfill (2026-07-09): the browser OAuth dialog for Instagram
// Login rejects every attempt with "Error validating verification code" despite
// a proven-correct secret, redirect_uri, tester status, and permissions - a
// black-box quirk in Meta's dialog we can't fix from outside. Meta's own
// "Generate access tokens" panel mints a working long-lived token directly for
// the account, bypassing the broken dialog entirely. This route takes that
// token (INSTAGRAM_MANUAL_TOKEN, pasted by Sandra - never seen by the agent)
// and saves the connection exactly as the OAuth callback would have.
// Delete this route + the env var once used.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = process.env.INSTAGRAM_MANUAL_TOKEN
  if (!token) {
    return NextResponse.json({ error: "INSTAGRAM_MANUAL_TOKEN not set" }, { status: 400 })
  }

  const profileRes = await fetch(
    `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${encodeURIComponent(token)}`,
  )
  const profile = await profileRes.json()
  if (!profileRes.ok || profile.error) {
    return NextResponse.json({ error: "profile_fetch_failed", detail: profile }, { status: 400 })
  }

  const [existing] = await sql`
    SELECT user_id FROM instagram_connections WHERE instagram_username = ${profile.username} LIMIT 1
  `
  if (!existing) {
    return NextResponse.json(
      { error: "no_existing_connection_row", detail: `No prior row for @${profile.username} to attach to` },
      { status: 400 },
    )
  }

  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

  await sql`
    UPDATE instagram_connections SET
      instagram_user_id = ${String(profile.id)},
      access_token = ${token},
      page_id = NULL,
      page_name = NULL,
      page_access_token = NULL,
      token_expires_at = ${expiresAt.toISOString()},
      account_type = 'instagram_login',
      messaging_status = 'needs_permission_test',
      messaging_test_error = NULL,
      is_active = true,
      updated_at = NOW()
    WHERE user_id = ${existing.user_id} AND instagram_username = ${profile.username}
  `

  return NextResponse.json({ ok: true, username: profile.username, instagramUserId: profile.id })
}
