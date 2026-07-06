import { describe, expect, it, vi, beforeEach } from "vitest"
import { generateOnboardingDay0Email } from "@/lib/email/templates/onboarding-day-0"
import { generateSelfieGuidePaidDeliveryEmail } from "@/lib/email/templates/selfie-guide-paid-delivery"
import { generateWelcomeEmail } from "@/lib/email/templates/welcome-email"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { SELFIE_GUIDE_EMAIL_TOUCHES } from "@/lib/email/selfie-guide-email-sequence"
import { sendWelcomeEmail } from "@/lib/welcome-email"

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}))

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: sendMock,
    },
  })),
}))

describe("email audit remediation", () => {
  beforeEach(() => {
    sendMock.mockReset()
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
    process.env.RESEND_API_KEY = "re_test"
  })

  it("removes download language from the paid Selfie Guide delivery email", () => {
    const content = generateSelfieGuidePaidDeliveryEmail({
      firstName: "Sandra",
      email: "sandra@example.com",
      accessUrl: "https://sselfie.ai/selfie-guide/access/abc123",
      passwordSetupLink: "https://sselfie.ai/auth/setup-password",
    })

    expect(content.subject).toBe("Your First Visible Post Guide is ready")
    expect(content.subject.toLowerCase()).not.toContain("download")
    expect(content.html.toLowerCase()).not.toContain("download your selfie guide")
    expect(content.text.toLowerCase()).not.toContain("download your selfie guide")
    expect(content.html).toContain("Open your guide")
    expect(content.html).toContain("See the Starter Kit")
    expect(content.html).not.toContain("Visibility Suite")
    expect(content.html).toContain("#0D0E10")
    expect(content.html).toContain("#F8FAFA")
  })

  it("uses Sandra as the Day 0 onboarding sign-off and the cool editorial palette", () => {
    const content = generateOnboardingDay0Email({ firstName: "Sandra" })

    expect(content.html).not.toContain("Maya + The SSELFIE Studio Team")
    expect(content.text).not.toContain("Maya + The SSELFIE Studio Team")
    expect(content.html).toContain("Sandra")
    expect(content.html).toContain("#0D0E10")
    expect(content.html).toContain("#F8FAFA")
  })

  it("uses the canonical Studio URL in the welcome email template", () => {
    const content = generateWelcomeEmail({
      customerName: "Sandra",
      customerEmail: "sandra@example.com",
      creditsGranted: 200,
      packageName: "STUDIO MEMBERSHIP",
      productType: "sselfie_studio_membership",
    })

    expect(content.html).toContain("https://sselfie.ai/app")
    expect(content.html).not.toContain("app.sselfie.ai")
    expect(content.html).toContain("#0D0E10")
    expect(content.html).toContain("#F8FAFA")
  })

  it("prefers a real customer name over the email local-part", () => {
    expect(getFirstNameForEmail({ fullName: "Jessica Smith", email: "jsmith@example.com" })).toBe("Jessica")
    expect(getFirstNameForEmail({ fullName: "  ", email: "jsmith@example.com" })).toBe("jsmith")
    expect(getFirstNameForEmail({ fullName: undefined, email: "" })).toBe("friend")
  })

  it("keeps the paid Selfie Guide activation and follow-up touches registered", () => {
    expect(SELFIE_GUIDE_EMAIL_TOUCHES).toEqual([
      { days: 0, emailType: "selfie-guide-activation-day0" },
      { days: 3, emailType: "selfie-guide-day3-checkin" },
      { days: 7, emailType: "selfie-guide-day7-challenge" },
      { days: 14, emailType: "selfie-guide-day14-maya-bridge" },
      { days: 21, emailType: "selfie-guide-day21-final" },
    ])
  })

  it("uses the canonical Studio URL in the legacy welcome sender too", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_123" }, error: null })

    await sendWelcomeEmail("sandra@example.com", "Sandra")

    expect(sendMock).toHaveBeenCalledTimes(1)
    const payload = sendMock.mock.calls[0][0]
    expect(payload.html).toContain("https://sselfie.ai/app")
    expect(payload.html).not.toContain("app.sselfie.ai")
  })
})
