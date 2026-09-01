import { NextResponse } from "next/server"

import { sql } from "@/lib/db/client"
import { verifySkoolSetupEntryToken } from "@/lib/skool/setup-link"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 30

function productionOrigin(value: string | null | undefined): string {
  try {
    const parsed = new URL(value || "https://sselfie.ai")
    if (
      parsed.protocol === "https:" &&
      (parsed.hostname === "sselfie.ai" || parsed.hostname === "www.sselfie.ai")
    ) {
      return parsed.origin
    }
  } catch {
    // Fall through to canonical production origin.
  }
  return "https://sselfie.ai"
}

function firstPartyRecoveryRedirect(actionLink: string, origin: string): string | null {
  try {
    const providerUrl = new URL(actionLink)
    const tokenHash = providerUrl.searchParams.get("token_hash")
    const token = providerUrl.searchParams.get("token")
    const type = providerUrl.searchParams.get("type") || "recovery"
    if (!tokenHash && !token) return null

    const destination = "/auth/setup-password?next=%2Fapp"
    const confirmUrl = new URL("/auth/confirm", origin)
    if (tokenHash) confirmUrl.searchParams.set("token_hash", tokenHash)
    else if (token) confirmUrl.searchParams.set("token", token)
    confirmUrl.searchParams.set("type", type)
    confirmUrl.searchParams.set("redirect_to", destination)
    return confirmUrl.toString()
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const signingSecret = process.env.SKOOL_MEMBERSHIP_INGRESS_SECRET
  if (!signingSecret) {
    return NextResponse.json(
      { error: "Account setup is temporarily unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid setup request" },
      { status: 400, headers: { "cache-control": "no-store" } },
    )
  }

  const value = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : null
  const membershipKey = typeof value?.membershipKey === "string" ? value.membershipKey : ""
  const token = typeof value?.token === "string" ? value.token : ""

  if (!verifySkoolSetupEntryToken({ membershipKey, token, secret: signingSecret })) {
    return NextResponse.json(
      { error: "This setup link is invalid" },
      { status: 401, headers: { "cache-control": "no-store" } },
    )
  }

  const rows = await sql`
    SELECT
      e.user_id,
      u.email,
      u.password_setup_complete
    FROM skool_membership_entitlements e
    JOIN users u ON u.id = e.user_id
    WHERE e.membership_key = ${membershipKey}
      AND e.group_id = 'sselfie-photo-club-2569'
      AND e.plan_code = 'sselfie-skool-monthly'
      AND e.access_status = 'active'
    LIMIT 1
  `
  const member = rows[0] as {
    user_id?: string
    email?: string
    password_setup_complete?: boolean | null
  } | undefined

  if (!member?.user_id || !member.email) {
    return NextResponse.json(
      { error: "Active SSELFIE membership was not found" },
      { status: 404, headers: { "cache-control": "no-store" } },
    )
  }

  if (member.password_setup_complete === true) {
    const login = new URL("/auth/login", productionOrigin(process.env.NEXT_PUBLIC_SITE_URL))
    login.searchParams.set("returnTo", "/app")
    return NextResponse.json(
      { success: true, state: "ready", redirectUrl: login.toString() },
      { headers: { "cache-control": "no-store" } },
    )
  }

  const origin = productionOrigin(process.env.NEXT_PUBLIC_SITE_URL)
  const admin = createAdminClient().auth.admin
  const { data, error } = await admin.generateLink({
    type: "recovery",
    email: member.email,
    options: { redirectTo: `${origin}/auth/setup-password?next=%2Fapp` },
  })
  const actionLink = data?.properties?.action_link
  const redirectUrl = actionLink ? firstPartyRecoveryRedirect(actionLink, origin) : null

  if (error || !redirectUrl) {
    return NextResponse.json(
      { error: "We could not start account setup. Please try the link again." },
      { status: 503, headers: { "cache-control": "no-store" } },
    )
  }

  return NextResponse.json(
    { success: true, state: "recovery_required", redirectUrl },
    { headers: { "cache-control": "no-store" } },
  )
}
