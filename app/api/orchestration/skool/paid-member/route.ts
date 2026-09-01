import { NextResponse } from "next/server"

import { ensureSkoolMemberAccount } from "@/lib/skool/account-provisioning"
import {
  normalizeSkoolMembershipEnvelope,
  verifySkoolIngressSignature,
} from "@/lib/skool/membership-contract"
import { grantSkoolMembership } from "@/lib/skool/membership-service"
import { sendSkoolSetupEmail } from "@/lib/skool/setup-email"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: Request) {
  // Deployment is inert until the release steward explicitly activates the
  // already-approved issue #25 cutover after migrations and E2E verification.
  if (process.env.SKOOL_MEMBERSHIP_PROVISIONING_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Skool membership provisioning is not active" },
      { status: 503 },
    )
  }

  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody, "utf8") > 16_384) {
    return NextResponse.json({ error: "Invalid request" }, { status: 413 })
  }

  const signatureTimestamp = request.headers.get("x-sselfie-timestamp")
  const signatureValid = verifySkoolIngressSignature({
    rawBody,
    timestamp: signatureTimestamp,
    signature: request.headers.get("x-sselfie-signature"),
    secret: process.env.SKOOL_MEMBERSHIP_INGRESS_SECRET,
  })
  if (!signatureValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const ingressTime = new Date(Number(signatureTimestamp) * 1000)
  const envelope = normalizeSkoolMembershipEnvelope(
    parsed,
    process.env.SKOOL_MEMBERSHIP_AUDIT_KEY_SECRET,
    { now: ingressTime },
  )
  if (!envelope) {
    return NextResponse.json({ error: "Unapproved membership event" }, { status: 422 })
  }

  try {
    const account = await ensureSkoolMemberAccount({
      email: envelope.privateProvisioning.email,
      productionUrl: process.env.NEXT_PUBLIC_SITE_URL,
    })
    const grant = await grantSkoolMembership({ userId: account.userId, envelope })

    let setupEmailSent = false
    if (account.accountState === "recovery_required") {
      if (!account.recoveryLink) throw new Error("SKOOL_RECOVERY_LINK_FAILED")
      await sendSkoolSetupEmail({
        email: envelope.privateProvisioning.email,
        recoveryLink: account.recoveryLink,
        membershipKey: envelope.membershipKey,
      })
      setupEmailSent = true
    }

    return NextResponse.json({
      success: true,
      replay: grant.replay,
      account: {
        state: account.accountState,
        setupEmailSent,
      },
      entitlement: { source: "skool", status: "active" },
      credits: { granted: grant.creditsGranted, balance: grant.balance },
    })
  } catch (error) {
    const rawCode = error instanceof Error ? error.message : ""
    const code = [
      "SKOOL_IDENTITY_CONFLICT",
      "SKOOL_ENTITLEMENT_CONFLICT",
      "SKOOL_AUTH_PROVISIONING_FAILED",
      "SKOOL_RECOVERY_LINK_FAILED",
      "SKOOL_SETUP_EMAIL_FAILED",
    ].includes(rawCode)
      ? rawCode
      : "SKOOL_PROVISIONING_FAILED"
    if (code === "SKOOL_IDENTITY_CONFLICT" || code === "SKOOL_ENTITLEMENT_CONFLICT") {
      return NextResponse.json(
        { error: "Membership needs technical review", code },
        { status: 409 },
      )
    }
    console.error("[skool-membership] Provisioning failed", { code })
    return NextResponse.json(
      { error: "Membership provisioning failed", code },
      { status: 500 },
    )
  }
}
