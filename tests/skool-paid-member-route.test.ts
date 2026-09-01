// @vitest-environment node
import { createHmac } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  ensureAccount: vi.fn(),
  grantMembership: vi.fn(),
  sendSetupEmail: vi.fn(),
}))

vi.mock("@/lib/skool/account-provisioning", () => ({
  ensureSkoolMemberAccount: mocks.ensureAccount,
}))
vi.mock("@/lib/skool/membership-service", () => ({
  grantSkoolMembership: mocks.grantMembership,
}))
vi.mock("@/lib/skool/setup-email", () => ({
  sendSkoolSetupEmail: mocks.sendSetupEmail,
}))

const SECRET = Buffer.alloc(32, 7).toString("base64url")
const NOW_SECONDS = 1788249600

function body(overrides: Record<string, unknown> = {}) {
  const email = "member@example.com"
  const groupId = "sselfie-photo-club-2569"
  const digest = createHmac("sha256", Buffer.from(SECRET, "base64url"))
    .update(`${groupId}\0${email}`)
    .digest("hex")
    .slice(0, 32)
  const membershipKey = `skool:${groupId}:${digest}`
  return {
    schemaVersion: 1,
    source: "skool",
    eventType: "membership.present",
    groupId,
    planCode: "sselfie-skool-monthly",
    observedAt: "2026-09-01T08:00:00.000Z",
    membershipKey,
    dedupeKey: `${membershipKey}:present`,
    privateProvisioning: { email },
    ...overrides,
  }
}

async function signedRequest(payload: object) {
  const rawBody = JSON.stringify(payload)
  const { signSkoolIngressForTest } = await import("@/lib/skool/membership-contract")
  return new Request("https://sselfie.ai/api/orchestration/skool/paid-member", {
    method: "POST",
    body: rawBody,
    headers: {
      "content-type": "application/json",
      "x-sselfie-timestamp": String(NOW_SECONDS),
      "x-sselfie-signature": signSkoolIngressForTest(rawBody, String(NOW_SECONDS), SECRET),
    },
  })
}

describe("Skool paid-member ingress", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW_SECONDS * 1000))
    process.env.SKOOL_MEMBERSHIP_INGRESS_SECRET = SECRET
    process.env.SKOOL_MEMBERSHIP_AUDIT_KEY_SECRET = SECRET
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
    delete process.env.SKOOL_MEMBERSHIP_PROVISIONING_ENABLED
    Object.values(mocks).forEach(mock => mock.mockReset())
    mocks.sendSetupEmail.mockResolvedValue({ messageId: "email_1" })
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.SKOOL_MEMBERSHIP_PROVISIONING_ENABLED
  })

  it("is inert until the release gate is explicitly enabled", async () => {
    const { POST } = await import("@/app/api/orchestration/skool/paid-member/route")
    const response = await POST(await signedRequest(body()))
    expect(response.status).toBe(503)
    expect(mocks.ensureAccount).not.toHaveBeenCalled()
    expect(mocks.grantMembership).not.toHaveBeenCalled()
    expect(mocks.sendSetupEmail).not.toHaveBeenCalled()
  })

  it("rejects invalid signatures, an unapproved free plan, and future observations", async () => {
    process.env.SKOOL_MEMBERSHIP_PROVISIONING_ENABLED = "true"
    const { POST } = await import("@/app/api/orchestration/skool/paid-member/route")
    const unauthorized = await POST(
      new Request("https://sselfie.ai/api/orchestration/skool/paid-member", {
        method: "POST",
        body: JSON.stringify(body()),
        headers: {
          "x-sselfie-timestamp": String(NOW_SECONDS),
          "x-sselfie-signature": "v1=invalid",
        },
      }),
    )
    expect(unauthorized.status).toBe(401)

    const freePlan = await POST(await signedRequest(body({ planCode: "free" })))
    expect(freePlan.status).toBe(422)

    const futureObservation = await POST(
      await signedRequest(body({ observedAt: "2026-09-01T08:05:01.000Z" })),
    )
    expect(futureObservation.status).toBe(422)
    expect(mocks.ensureAccount).not.toHaveBeenCalled()
  })

  it("delivers a private setup email and returns grant state without exposing recovery secrets", async () => {
    process.env.SKOOL_MEMBERSHIP_PROVISIONING_ENABLED = "true"
    const payload = body()
    mocks.ensureAccount.mockResolvedValue({
      userId: "user_1",
      authUserId: "auth_1",
      accountState: "recovery_required",
      recoveryLink: "https://sselfie.ai/auth/confirm?token=customer-bearer-secret",
    })
    mocks.grantMembership.mockResolvedValue({
      replay: false,
      creditsGranted: 100,
      balance: 100,
    })

    const { POST } = await import("@/app/api/orchestration/skool/paid-member/route")
    const response = await POST(await signedRequest(payload))
    const responseBody = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.sendSetupEmail).toHaveBeenCalledWith({
      email: "member@example.com",
      recoveryLink: "https://sselfie.ai/auth/confirm?token=customer-bearer-secret",
      membershipKey: payload.membershipKey,
    })
    expect(responseBody).toMatchObject({
      success: true,
      replay: false,
      account: { state: "recovery_required", setupEmailSent: true },
      entitlement: { source: "skool", status: "active" },
      credits: { granted: 100, balance: 100 },
    })
    const serialized = JSON.stringify(responseBody)
    expect(serialized).not.toContain("member@example.com")
    expect(serialized).not.toContain("recoveryLink")
    expect(serialized).not.toContain("customer-bearer-secret")
    expect(serialized).not.toContain("token=")
  })

  it("fails the webhook so the delivery can retry when setup email delivery fails", async () => {
    process.env.SKOOL_MEMBERSHIP_PROVISIONING_ENABLED = "true"
    mocks.ensureAccount.mockResolvedValue({
      userId: "user_1",
      authUserId: "auth_1",
      accountState: "recovery_required",
      recoveryLink: "https://sselfie.ai/auth/confirm?token=customer-bearer-secret",
    })
    mocks.grantMembership.mockResolvedValue({
      replay: false,
      creditsGranted: 100,
      balance: 100,
    })
    mocks.sendSetupEmail.mockRejectedValue(new Error("SKOOL_SETUP_EMAIL_FAILED"))

    const { POST } = await import("@/app/api/orchestration/skool/paid-member/route")
    const response = await POST(await signedRequest(body()))
    const responseBody = await response.json()

    expect(response.status).toBe(500)
    expect(responseBody).toEqual({
      error: "Membership provisioning failed",
      code: "SKOOL_SETUP_EMAIL_FAILED",
    })
    expect(JSON.stringify(responseBody)).not.toContain("customer-bearer-secret")
  })
})
