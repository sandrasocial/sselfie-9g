// @vitest-environment node
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
  return {
    schemaVersion: 1,
    source: "skool",
    eventType: "membership.present",
    groupId: "sselfie-photo-club-2569",
    planCode: "sselfie-skool-monthly",
    observedAt: "2026-09-01T08:00:00.000Z",
    privateProvisioning: { email: "member@example.com" },
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
    delete process.env.SKOOL_MEMBERSHIP_AUDIT_KEY_SECRET
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
    delete process.env.SKOOL_MEMBERSHIP_PROVISIONING_ENABLED
    Object.values(mocks).forEach(mock => mock.mockReset())
    mocks.sendSetupEmail.mockResolvedValue({ messageId: "email_1" })
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.SKOOL_MEMBERSHIP_PROVISIONING_ENABLED
    delete process.env.SKOOL_MEMBERSHIP_AUDIT_KEY_SECRET
  })

  it("is inert until the release gate is explicitly enabled", async () => {
    const { POST } = await import("@/app/api/orchestration/skool/paid-member/route")
    const response = await POST(await signedRequest(body()))
    expect(response.status).toBe(503)
    expect(mocks.ensureAccount).not.toHaveBeenCalled()
    expect(mocks.grantMembership).not.toHaveBeenCalled()
    expect(mocks.sendSetupEmail).not.toHaveBeenCalled()
  })

  it("fails closed when provisioning is enabled but the signing secret is absent", async () => {
    process.env.SKOOL_MEMBERSHIP_PROVISIONING_ENABLED = "true"
    delete process.env.SKOOL_MEMBERSHIP_INGRESS_SECRET
    const { POST } = await import("@/app/api/orchestration/skool/paid-member/route")
    const response = await POST(
      new Request("https://sselfie.ai/api/orchestration/skool/paid-member", {
        method: "POST",
        body: JSON.stringify(body()),
      }),
    )
    expect(response.status).toBe(503)
    expect(mocks.ensureAccount).not.toHaveBeenCalled()
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

  it("derives private audit ids, delivers a stable SSELFIE setup entry, and exposes only safe state", async () => {
    process.env.SKOOL_MEMBERSHIP_PROVISIONING_ENABLED = "true"
    mocks.ensureAccount.mockResolvedValue({
      userId: "user_1",
      authUserId: "auth_1",
      accountState: "recovery_required",
    })
    mocks.grantMembership.mockResolvedValue({
      replay: false,
      creditsGranted: 100,
      balance: 100,
    })

    const { POST } = await import("@/app/api/orchestration/skool/paid-member/route")
    const response = await POST(await signedRequest(body()))
    const responseBody = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.grantMembership).toHaveBeenCalledWith({
      userId: "user_1",
      envelope: expect.objectContaining({
        billingPeriodKey: "2026-09-01",
        membershipKey: expect.stringMatching(/^skool:sselfie-photo-club-2569:[a-f0-9]{32}$/),
        dedupeKey: expect.stringMatching(/:period:2026-09-01$/),
      }),
    })
    expect(mocks.sendSetupEmail).toHaveBeenCalledWith({
      email: "member@example.com",
      setupLink: expect.stringMatching(
        /^https:\/\/sselfie\.ai\/auth\/skool-setup\?membership=skool%3Asselfie-photo-club-2569%3A[a-f0-9]{32}#token=[A-Za-z0-9_-]{43}$/,
      ),
      membershipKey: expect.stringMatching(/^skool:sselfie-photo-club-2569:[a-f0-9]{32}$/),
      billingPeriodKey: "2026-09-01",
    })
    expect(responseBody).toMatchObject({
      success: true,
      replay: false,
      billingPeriodKey: "2026-09-01",
      account: { state: "recovery_required", setupEmailSent: true },
      entitlement: { source: "skool", status: "active" },
      credits: { granted: 100, balance: 100 },
    })
    const serialized = JSON.stringify(responseBody)
    expect(serialized).not.toContain("member@example.com")
    expect(serialized).not.toContain("setupLink")
    expect(serialized).not.toContain("#token=")
  })

  it("fails the webhook so the delivery can retry when setup email delivery fails", async () => {
    process.env.SKOOL_MEMBERSHIP_PROVISIONING_ENABLED = "true"
    mocks.ensureAccount.mockResolvedValue({
      userId: "user_1",
      authUserId: "auth_1",
      accountState: "recovery_required",
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
  })
})
