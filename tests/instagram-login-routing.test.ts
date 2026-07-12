// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("Instagram Login routing", () => {
  it("keeps admin reconnect on the stable Facebook Page fallback path", () => {
    const adminDashboard = fs.readFileSync(path.join(ROOT, "app/admin/page.tsx"), "utf8")
    const connectRoute = fs.readFileSync(path.join(ROOT, "app/api/instagram/connect/route.ts"), "utf8")

    expect(adminDashboard).not.toContain("provider=instagram")
    expect(adminDashboard).toContain("/api/instagram/connect?redirect=1")
    expect(connectRoute).toContain("https://www.instagram.com/oauth/authorize")
    expect(connectRoute).toContain("INSTAGRAM_LOGIN_APP_ID")
    expect(connectRoute).toContain("Instagram Login App ID not configured")
    expect(connectRoute).toContain("INSTAGRAM_LOGIN_APP_ID === FACEBOOK_APP_ID")
    expect(connectRoute).toContain("instagram_business_manage_insights")
    expect(connectRoute).not.toContain("'pages_messaging'")
    expect(connectRoute).not.toContain("'pages_manage_metadata'")
    expect(connectRoute).not.toContain("instagram_business_manage_messages")
    expect(connectRoute).not.toContain("instagram_business_manage_comments")
    expect(connectRoute).not.toContain("'instagram_manage_messages'")
    expect(connectRoute).not.toContain("'instagram_manage_comments'")
    expect(connectRoute).not.toContain("INSTAGRAM_LOGIN_SCOPES")
  })

  it("stores Instagram Login tokens without requiring Facebook Page tokens", () => {
    const callbackRoute = fs.readFileSync(path.join(ROOT, "app/api/instagram/callback/route.ts"), "utf8")

    expect(callbackRoute).toContain('provider === "instagram_login"')
    expect(callbackRoute).toContain("INSTAGRAM_LOGIN_APP_ID")
    expect(callbackRoute).toContain("INSTAGRAM_LOGIN_APP_SECRET")
    expect(callbackRoute).toContain("https://api.instagram.com/oauth/access_token")
    expect(callbackRoute).toContain("https://graph.instagram.com/access_token")
    expect(callbackRoute).toContain("page_access_token = NULL")
    expect(callbackRoute).toContain("account_type = ${\"instagram_login\"}")
    expect(callbackRoute).not.toContain("messaging_status")
    expect(callbackRoute).not.toContain("messaging_test_error")
  })

  it("keeps the Facebook Page fallback separate from Instagram Login app configuration", () => {
    const connectRoute = fs.readFileSync(path.join(ROOT, "app/api/instagram/connect/route.ts"), "utf8")
    const callbackRoute = fs.readFileSync(path.join(ROOT, "app/api/instagram/callback/route.ts"), "utf8")

    expect(connectRoute).toContain("FACEBOOK_APP_ID")
    expect(connectRoute).toContain("authUrl.searchParams.append('client_id', INSTAGRAM_LOGIN_APP_ID)")
    expect(connectRoute).toContain("authUrl.searchParams.append('client_id', FACEBOOK_APP_ID)")
    expect(callbackRoute).toContain("client_id: INSTAGRAM_LOGIN_APP_ID")
    expect(callbackRoute).toContain("client_secret: INSTAGRAM_LOGIN_APP_SECRET")
    expect(callbackRoute).toContain("client_id=${FACEBOOK_APP_ID}")
    expect(callbackRoute).toContain("client_secret=${FACEBOOK_APP_SECRET}")
  })
})
