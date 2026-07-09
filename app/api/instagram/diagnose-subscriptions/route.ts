import { NextRequest, NextResponse } from "next/server"

// TEMP diagnostic (2026-07-09): the webhook signature never matches either
// configured secret even after multiple rotations, which means the secret
// values themselves don't belong to whichever app actually holds the live
// Instagram webhook subscription. Ask each app which callback URL and
// fields it has subscribed, using its own in-runtime secret to build the
// app access token. Never returns the secret itself, only Meta's
// subscription metadata. Delete this route once the mismatch is resolved.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("x-admin-secret")
  const isLocalDev = process.env.VERCEL_ENV === undefined
  if (!isLocalDev && authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apps = [
    { label: "FACEBOOK_APP_ID (INSTAGRAM_APP_SECRET)", id: process.env.INSTAGRAM_APP_ID || "1210263417166165", secret: process.env.INSTAGRAM_APP_SECRET },
    { label: "INSTAGRAM_LOGIN_APP_ID (INSTAGRAM_LOGIN_APP_SECRET)", id: process.env.INSTAGRAM_LOGIN_APP_ID, secret: process.env.INSTAGRAM_LOGIN_APP_SECRET },
  ]

  const results: Record<string, unknown> = {}

  for (const app of apps) {
    if (!app.id || !app.secret) {
      results[app.label] = { error: "missing app id or secret" }
      continue
    }
    try {
      const url = `https://graph.facebook.com/v21.0/${app.id}/subscriptions?access_token=${app.id}|${app.secret}`
      const res = await fetch(url)
      const json = await res.json()
      results[app.label] = { appId: app.id, status: res.status, data: json }
    } catch (error) {
      results[app.label] = { appId: app.id, error: error instanceof Error ? error.message : String(error) }
    }

    // Independent check: ask Meta's own OAuth endpoint to mint an app access
    // token via client_credentials. Cleaner error surface than /subscriptions.
    try {
      const oauthUrl = `https://graph.facebook.com/oauth/access_token?client_id=${app.id}&client_secret=${app.secret}&grant_type=client_credentials`
      const oauthRes = await fetch(oauthUrl)
      const oauthJson = await oauthRes.json()
      results[`${app.label} :: client_credentials`] = { status: oauthRes.status, data: oauthJson }
    } catch (error) {
      results[`${app.label} :: client_credentials`] = { error: error instanceof Error ? error.message : String(error) }
    }
  }

  return NextResponse.json({ summary: "Instagram webhook subscription check", results })
}
