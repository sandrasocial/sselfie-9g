// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const sendEmailMock = vi.fn()
const cronStartMock = vi.fn()
const cronSuccessMock = vi.fn()
const cronErrorMock = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: sendEmailMock,
}))

vi.mock("@/lib/cron-logger", () => ({
  createCronLogger: () => ({
    start: cronStartMock,
    success: cronSuccessMock,
    error: cronErrorMock,
  }),
}))

vi.mock("@/lib/admin-error-log", () => ({
  logAdminError: vi.fn(),
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: vi.fn().mockResolvedValue({ ok: true }),
}))

function renderTaggedTemplate(strings: TemplateStringsArray, values: unknown[]): string {
  let output = ""

  for (let index = 0; index < strings.length; index += 1) {
    output += strings[index]
    if (index < values.length) {
      output += typeof values[index] === "string" ? values[index] : `__value_${index}__`
    }
  }

  return output
}

// The kit CANDIDATE query selects on this source; the guide candidates query merely
// EXCLUDES the same source string in a NOT IN list, so match the selection pattern.
const KIT_QUERY_MARKER = "fs.source = 'selfie-ai-photos-kit-paid'"

describe("Selfie To AI Photos Kit nurture (cron: nurture-sequence)", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.VERCEL_ENV
    delete process.env.SELFIE_AI_PHOTOS_KIT_NURTURE_ENABLED
    process.env.NODE_ENV = "test"
    process.env.CRON_SECRET = "cron-secret"
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
  })

  it("skips the kit sequence entirely when the flag is off", async () => {
    const queries: string[] = []

    sqlMock.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      queries.push(renderTaggedTemplate(strings, values))
      return []
    })

    const { GET } = await import("@/app/api/cron/nurture-sequence/route")
    const response = await GET(new Request("http://localhost/api/cron/nurture-sequence"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(body.results.selfieAiPhotosKitDay2).toEqual({ found: 0, sent: 0, failed: 0 })
    expect(body.results.selfieAiPhotosKitDay4).toEqual({ found: 0, sent: 0, failed: 0 })
    expect(body.results.selfieAiPhotosKitDay8).toEqual({ found: 0, sent: 0, failed: 0 })
    expect(queries.some(query => query.includes(KIT_QUERY_MARKER))).toBe(false)
  })

  it("sends all three kit touches when the flag is on and candidates exist", async () => {
    const kitQueries: string[] = []

    process.env.SELFIE_AI_PHOTOS_KIT_NURTURE_ENABLED = "true"

    sqlMock.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = renderTaggedTemplate(strings, values)
      if (query.includes(KIT_QUERY_MARKER) && query.includes("freebie_subscribers")) {
        kitQueries.push(query)
        return [
          {
            email: "buyer@example.com",
            name: "Anna",
            access_token: "kit-token-123",
            converted_at: "2026-06-20T00:00:00.000Z",
            created_at: "2026-06-20T00:00:00.000Z",
          },
        ]
      }
      return []
    })

    sendEmailMock.mockResolvedValue({ success: true, messageId: "msg-1" })

    const { GET } = await import("@/app/api/cron/nurture-sequence/route")
    const response = await GET(new Request("http://localhost/api/cron/nurture-sequence"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results.selfieAiPhotosKitDay2).toEqual({ found: 1, sent: 1, failed: 0 })
    expect(body.results.selfieAiPhotosKitDay4).toEqual({ found: 1, sent: 1, failed: 0 })
    expect(body.results.selfieAiPhotosKitDay8).toEqual({ found: 1, sent: 1, failed: 0 })
    expect(body.totalSent).toBe(3)

    const emailTypes = sendEmailMock.mock.calls.map(call => call[0].emailType)
    expect(emailTypes).toEqual([
      "selfie-ai-photos-kit-day2-first-photo",
      "selfie-ai-photos-kit-day4-vault-bridge",
      "selfie-ai-photos-kit-day8-suite-trial",
    ])

    // Every kit send is a marketing email addressed to the buyer.
    for (const call of sendEmailMock.mock.calls) {
      expect(call[0].to).toBe("buyer@example.com")
      expect(call[0].marketing).toBe(true)
    }

    // Day 8 uses the personal SUITE trial claim link, not the kit access page.
    const day8Call = sendEmailMock.mock.calls[2][0]
    expect(day8Call.html).toContain("https://www.sselfie.ai/claim/kit-token-123")

    // Day 2 and day 4 link back to the kit access page.
    expect(sendEmailMock.mock.calls[0][0].html).toContain(
      "/access/selfie-to-ai-photos-kit/kit-token-123"
    )

    // Per-touch audience guards: vault owners skip the bridge, members skip the trial.
    expect(kitQueries).toHaveLength(3)
    expect(kitQueries[1]).toContain("bought_prompt_vault")
    expect(kitQueries[2]).toContain("sselfie_studio_membership")
    // Each touch is idempotent via email_logs.
    for (const query of kitQueries) {
      expect(query).toContain("email_logs")
    }
  })

  it("keeps kit buyers out of the free ai-prompts lead sequence", async () => {
    const queries: string[] = []

    process.env.LEGACY_NURTURE_AI_PROMPTS_ENABLED = "true"
    process.env.AI_PROMPTS_NURTURE_ENABLED = "true"

    sqlMock.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      queries.push(renderTaggedTemplate(strings, values))
      return []
    })

    const { GET } = await import("@/app/api/cron/nurture-sequence/route")
    await GET(new Request("http://localhost/api/cron/nurture-sequence"))

    const aiPromptsQueries = queries.filter(
      query => query.includes("'ai-prompts-subscriber'") && query.includes("freebie_subscribers")
    )
    expect(aiPromptsQueries.length).toBeGreaterThan(0)
    for (const query of aiPromptsQueries) {
      expect(query).toContain("bought_selfie_ai_photos_kit")
    }

    delete process.env.LEGACY_NURTURE_AI_PROMPTS_ENABLED
    delete process.env.AI_PROMPTS_NURTURE_ENABLED
  })
})

describe("Selfie To AI Photos Kit buyer sequence templates", () => {
  const params = {
    firstName: "Anna",
    accessUrl: "https://sselfie.ai/access/selfie-to-ai-photos-kit/kit-token-123",
    recipientEmail: "buyer@example.com",
  }

  it("day 2 checks in on the first photo and links the kit", async () => {
    const { generateSelfieAiPhotosKitDay2FirstPhotoEmail } = await import(
      "@/lib/email/templates/selfie-ai-photos-kit-buyer-sequence"
    )
    const email = generateSelfieAiPhotosKitDay2FirstPhotoEmail(params)

    expect(email.subject).toBe("did you make your first AI photo?")
    expect(email.html).toContain("/access/selfie-to-ai-photos-kit/kit-token-123")
    expect(email.html).toContain("utm_campaign=selfie_ai_photos_kit_day2")
    expect(email.text).toContain("still-you fix prompts")
  })

  it("day 4 bridges to the Prompt Vault checkout with attribution and prefilled email", async () => {
    const { generateSelfieAiPhotosKitDay4VaultBridgeEmail } = await import(
      "@/lib/email/templates/selfie-ai-photos-kit-buyer-sequence"
    )
    const email = generateSelfieAiPhotosKitDay4VaultBridgeEmail(params)

    expect(email.subject).toBe("when one look isn't enough")
    expect(email.html).toContain("/checkout/prompt-vault")
    expect(email.html).toContain("utm_campaign=selfie_ai_photos_kit_day4_vault_bridge")
    expect(email.html).toContain("checkout_email=buyer%40example.com")
    expect(email.html).toContain("checkout_source=selfie_ai_photos_kit_nurture")
    expect(email.text).toContain("$37")
  })

  it("day 8 offers the SUITE trial via the personal claim link", async () => {
    const { generateSelfieAiPhotosKitDay8SuiteTrialEmail } = await import(
      "@/lib/email/templates/selfie-ai-photos-kit-buyer-sequence"
    )
    const email = generateSelfieAiPhotosKitDay8SuiteTrialEmail({
      firstName: "Anna",
      claimUrl: "https://sselfie.ai/claim/kit-token-123",
    })

    expect(email.subject).toBe("the faster way to do this")
    expect(email.html).toContain("https://sselfie.ai/claim/kit-token-123")
    expect(email.text).toContain("No card")
    expect(email.text).toContain("still look like you")
  })

  it("all three templates respect the voice and No-Fake language rules", async () => {
    const templates = await import("@/lib/email/templates/selfie-ai-photos-kit-buyer-sequence")
    const emails = [
      templates.generateSelfieAiPhotosKitDay2FirstPhotoEmail(params),
      templates.generateSelfieAiPhotosKitDay4VaultBridgeEmail(params),
      templates.generateSelfieAiPhotosKitDay8SuiteTrialEmail({
        firstName: "Anna",
        claimUrl: "https://sselfie.ai/claim/kit-token-123",
      }),
    ]

    const bannedFragments = [
      "—", // m-dash is banned in customer copy
      "same face",
      "keeps your face",
      "no one will know",
      "look rich",
      "flawless",
      "perfect face",
      "elevated",
      "game changer",
      "skyrocket",
      "unlock",
    ]

    for (const email of emails) {
      const combined = `${email.subject}\n${email.html}\n${email.text}`.toLowerCase()
      for (const fragment of bannedFragments) {
        expect(combined).not.toContain(fragment)
      }
    }
  })
})
