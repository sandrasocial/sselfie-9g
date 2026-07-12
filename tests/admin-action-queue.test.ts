import { describe, expect, it } from "vitest"
import {
  signAdminActionToken,
  verifyAdminActionToken,
} from "@/lib/admin/action-token"
import {
  buildDailySandraBriefing,
  generateDailySandraBriefingEmail,
} from "@/lib/admin/daily-sandra-briefing"

const SECRET = "test-secret-that-is-long-enough-for-hmac"

function minimalGrowthReport() {
  return {
    generatedAt: "2026-07-10T07:00:00.000Z",
    windowDays: 7,
    eventCounts: {
      aiPromptOptins: 0,
      aiPromptAccessOpens: 0,
      freePromptCopies: 0,
      freeToVaultClicks: 0,
      vaultVisits: 0,
      checkoutStarts: 0,
      checkoutCompleted: 0,
      checkoutRecoverableStarts: 0,
      checkoutUnrecoverableStarts: 0,
      manychatCheckoutStarts: 0,
      manychatUnrecoverableStarts: 0,
      recoverySends: 0,
      vaultAccessOpens: 0,
      vaultAccessOpeners: 0,
      vaultPromptViews: 0,
      vaultPromptCopies: 0,
    },
    paymentCounts: { purchases: 0, revenueCents: 0 },
    buyerCounts: { buyers: 0 },
    topPromptSignals: [],
    freePromptSignals: [],
    attributionRows: [],
  }
}

describe("admin action tokens", () => {
  it("signs and verifies an unexpired action token", () => {
    const expiresAt = new Date("2026-07-11T12:00:00.000Z")
    const token = signAdminActionToken({ actionId: 42, expiresAt, secret: SECRET })

    expect(
      verifyAdminActionToken({
        token,
        secret: SECRET,
        now: new Date("2026-07-10T12:00:00.000Z"),
      }),
    ).toEqual({ actionId: 42, expiresAt })
  })

  it("rejects tampered and expired tokens", () => {
    const token = signAdminActionToken({
      actionId: 42,
      expiresAt: new Date("2026-07-11T12:00:00.000Z"),
      secret: SECRET,
    })

    expect(() =>
      verifyAdminActionToken({
        token: token.replace(/^42\./, "43."),
        secret: SECRET,
        now: new Date("2026-07-10T12:00:00.000Z"),
      }),
    ).toThrow("Invalid admin action token")

    expect(() =>
      verifyAdminActionToken({
        token,
        secret: SECRET,
        now: new Date("2026-07-12T12:00:00.000Z"),
      }),
    ).toThrow("Admin action token expired")
  })
})

describe("Daily Sandra Briefing approvals", () => {
  it("renders pending approvals with confirmation links", () => {
    const briefing = buildDailySandraBriefing(minimalGrowthReport() as any, {
      approvalActions: [
        {
          kind: "send_resend_broadcast",
          title: "Story · Sunday note",
          summary: "Review the preview, then confirm the send to the broadcast audience.",
          approvalUrl: "https://sselfie.ai/approve/signed-token",
          source: "Resend broadcasts",
        },
      ],
    })

    const email = generateDailySandraBriefingEmail(briefing)

    expect(email.html).toContain("Waiting on you")
    expect(email.html).toContain("Story · Sunday note")
    expect(email.html).toContain("https://sselfie.ai/approve/signed-token")
    expect(email.html).toContain("Review email")
    expect(email.text).toContain("Story · Sunday note")
  })

  it("omits the approvals block when nothing is pending", () => {
    const briefing = buildDailySandraBriefing(minimalGrowthReport() as any)
    const email = generateDailySandraBriefingEmail(briefing)

    expect(email.html).not.toContain("Waiting on you")
  })
})
