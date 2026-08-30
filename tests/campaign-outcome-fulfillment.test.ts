// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.hoisted(() => vi.fn())
const sendEmailMock = vi.hoisted(() => vi.fn())
const updateContactTagsMock = vi.hoisted(() => vi.fn())
const analyticsMock = vi.hoisted(() => vi.fn())
const generateObjectMock = vi.hoisted(() => vi.fn())
const generateImageMock = vi.hoisted(() => vi.fn())
const renderSlideMock = vi.hoisted(() => vi.fn())
const putMock = vi.hoisted(() => vi.fn())
const startVideoMock = vi.hoisted(() => vi.fn())
const checkVideoMock = vi.hoisted(() => vi.fn())
const pollPredictionMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: sendEmailMock }))
vi.mock("@/lib/resend/manage-contact", () => ({ updateContactTags: updateContactTagsMock }))
vi.mock("@/lib/analytics/events", () => ({ logAnalyticsEvent: analyticsMock }))
vi.mock("ai", () => ({ generateObject: generateObjectMock }))
vi.mock("@/lib/feed-planner/openai-image", () => ({
  generateFeedImageWithOpenAI: generateImageMock,
}))
vi.mock("@/lib/campaign-outcome/slide-renderer", () => ({
  renderCampaignSlide: renderSlideMock,
}))
vi.mock("@vercel/blob", () => ({ put: putMock }))
vi.mock("@/lib/maya/openrouter", () => ({ createMayaOpenRouterModel: vi.fn(() => "mock-model") }))
vi.mock("@/lib/maya/video-generation-service", () => ({
  startVideoGeneration: startVideoMock,
  checkVideoGeneration: checkVideoMock,
}))
vi.mock("@/lib/replicate-polling", () => ({ pollPrediction: pollPredictionMock }))

function queryText(call: unknown[]) {
  const strings = call[0] as TemplateStringsArray
  return Array.isArray(strings) ? strings.join(" ") : String(strings)
}

describe("campaign outcome payment fulfillment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("INSERT INTO campaign_orders"))
        return [{ id: 41, access_token: "t".repeat(43) }]
      return []
    })
    sendEmailMock.mockResolvedValue({ success: true, messageId: "email_1" })
    updateContactTagsMock.mockResolvedValue({ success: true })
    analyticsMock.mockResolvedValue({ ok: true })
  })

  it("creates one guest-safe private order and sends one intake email for a live paid session", async () => {
    const { handleCampaignOutcomeCheckout } =
      await import("@/lib/payments/handlers/campaign-outcome")
    await handleCampaignOutcomeCheckout({
      event: { livemode: true } as any,
      session: {
        id: "cs_campaign_1",
        amount_total: 9700,
        currency: "usd",
        payment_intent: "pi_campaign_1",
        customer: "cus_campaign_1",
        customer_details: { email: "buyer@example.com", name: "Buyer Name" },
        metadata: {
          utm_source: "email",
          utm_medium: "lifecycle",
          utm_campaign: "campaign_outcome_test",
          utm_content: "founder_test",
        },
      } as any,
      isPaymentPaid: true,
      customerEmail: "buyer@example.com",
      userId: null,
      referralPurchaseUserId: null,
      source: "campaign_outcome_paid",
    })

    const insert = sqlMock.mock.calls.find(call =>
      queryText(call).includes("INSERT INTO campaign_orders")
    )
    expect(insert).toBeTruthy()
    expect(queryText(insert!)).toContain("ON CONFLICT (stripe_session_id) DO NOTHING")
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        emailType: "campaign_outcome_intake",
        idempotencyKey: "campaign-outcome-intake:cs_campaign_1",
        text: expect.stringContaining("/campaign/order/"),
      })
    )
    expect(analyticsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "campaign_purchase",
        idempotencyKey: "purchase:pi_campaign_1",
        utm: {
          source: "email",
          medium: "lifecycle",
          campaign: "campaign_outcome_test",
          content: "founder_test",
          term: null,
        },
      })
    )
  })

  it("keeps a Stripe test order for dry-run proof but sends no customer email", async () => {
    const { handleCampaignOutcomeCheckout } =
      await import("@/lib/payments/handlers/campaign-outcome")
    await handleCampaignOutcomeCheckout({
      event: { livemode: false } as any,
      session: {
        id: "cs_test_campaign",
        amount_total: 9700,
        currency: "usd",
        payment_intent: "pi_test_campaign",
        customer_details: { email: "qa@example.com" },
        metadata: {},
      } as any,
      isPaymentPaid: true,
      customerEmail: "qa@example.com",
      userId: null,
      referralPurchaseUserId: null,
      source: "campaign_outcome_paid",
    })

    expect(
      sqlMock.mock.calls.some(call => queryText(call).includes("INSERT INTO campaign_orders"))
    ).toBe(true)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(updateContactTagsMock).not.toHaveBeenCalled()
  })

  it("does nothing when payment is not confirmed", async () => {
    const { handleCampaignOutcomeCheckout } =
      await import("@/lib/payments/handlers/campaign-outcome")
    await handleCampaignOutcomeCheckout({
      event: { livemode: true } as any,
      session: { id: "cs_unpaid" } as any,
      isPaymentPaid: false,
      customerEmail: "buyer@example.com",
      userId: null,
      referralPurchaseUserId: null,
      source: "campaign_outcome_paid",
    })
    expect(sqlMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("rejects a paid session that is not exactly $97 USD", async () => {
    const { handleCampaignOutcomeCheckout } =
      await import("@/lib/payments/handlers/campaign-outcome")
    await expect(
      handleCampaignOutcomeCheckout({
        event: { livemode: true } as any,
        session: {
          id: "cs_wrong_campaign_amount",
          amount_total: 9600,
          currency: "usd",
          customer_details: { email: "buyer@example.com" },
          metadata: {},
        } as any,
        isPaymentPaid: true,
        customerEmail: "buyer@example.com",
        userId: null,
        referralPurchaseUserId: null,
        source: "campaign_outcome_paid",
      })
    ).rejects.toThrow("expected USD 9700")
    expect(sqlMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("retries the private intake email when Stripe retries after an earlier email failure", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("INSERT INTO campaign_orders")) return []
      if (query.includes("FROM campaign_orders") && query.includes("stripe_session_id")) {
        return [
          {
            id: 42,
            access_token: "r".repeat(43),
            source_order_id: null,
            intake_email_sent_at: null,
          },
        ]
      }
      return []
    })

    const { handleCampaignOutcomeCheckout } =
      await import("@/lib/payments/handlers/campaign-outcome")
    await handleCampaignOutcomeCheckout({
      event: { livemode: true } as any,
      session: {
        id: "cs_campaign_retry",
        amount_total: 9700,
        currency: "usd",
        payment_intent: "pi_campaign_retry",
        customer_details: { email: "buyer@example.com", name: "Buyer Name" },
        metadata: {},
      } as any,
      isPaymentPaid: true,
      customerEmail: "buyer@example.com",
      userId: null,
      referralPurchaseUserId: null,
      source: "campaign_outcome_paid",
    })

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "campaign-outcome-intake:cs_campaign_retry",
        text: expect.stringContaining(`/campaign/order/${"r".repeat(43)}`),
      })
    )
    expect(
      sqlMock.mock.calls.some(call => queryText(call).includes("intake_email_sent_at = COALESCE"))
    ).toBe(true)
    expect(analyticsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "campaign_purchase",
        idempotencyKey: "purchase:pi_campaign_retry",
        properties: expect.objectContaining({ source: "campaign_outcome_paid" }),
      })
    )
  })
})

describe("campaign outcome Maya generation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    startVideoMock.mockResolvedValue({
      videoId: 88,
      predictionId: "pred-campaign-reel",
      status: "processing",
      creditsDeducted: 0,
      newBalance: 0,
      motionPrompt: "gentle push-in",
    })
    pollPredictionMock.mockResolvedValue({ status: "succeeded" })
    checkVideoMock.mockResolvedValue({
      status: "succeeded",
      videoUrl: "https://blob/reel-clip.mp4",
      progress: 100,
    })
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (
        query.includes("status = 'generating'") &&
        query.includes("RETURNING id, user_id, is_test_mode, customer_email")
      ) {
        return [
          {
            id: 51,
            user_id: "campaign-video-owner",
            is_test_mode: true,
            customer_email: "buyer@example.com",
            selfie_url: "https://example.com/selfie.jpg",
            what_she_sells: "A practical business course",
            promotion: "The September group",
            target_audience: "Women building a service business",
            voice_reference: "https://example.com/brand",
            platform: "Instagram",
          },
        ]
      }
      if (query.includes("status = 'needs_qa'")) return [{ id: 51 }]
      return []
    })
    generateObjectMock.mockResolvedValue({
      object: {
        visualDirection: "A clean editorial direction grounded in her real business.",
        firstPostReason: "it introduces the problem before making the offer",
        posts: ["attention", "trust", "offer"].map(role => ({
          role,
          headline: `${role} headline`,
          caption: `A useful ${role} caption with enough simple words to publish today.`,
          cta: "Use your real link or keyword here.",
          visualPrompt: `A realistic editorial ${role} portrait. Use exact facial features from the reference image.`,
          whyThisPost: `This ${role} post has one clear job in the campaign.`,
        })),
        alternatePhotos: [1, 2, 3].map(index => ({
          label: `Alternate ${index}`,
          visualPrompt: `A realistic editorial alternate ${index} portrait. Use exact facial features from the reference image.`,
          whyThisPhoto: "This gives the campaign one more useful angle.",
        })),
        carousel: {
          title: "Seven useful slides",
          slides: Array.from({ length: 7 }, (_, index) => ({
            headline: `Carousel ${index + 1}`,
            body: `Short supporting copy for carousel slide ${index + 1}.`,
          })),
        },
        storySequences: ["warmup", "offer"].map(role => ({
          role,
          title: role === "warmup" ? "Warm up" : "Make the offer",
          slides: Array.from({ length: 5 }, (_, index) => ({
            headline: `${role} story ${index + 1}`,
            body: `Short supporting copy for ${role} story ${index + 1}.`,
          })),
        })),
        publishPlan: Array.from({ length: 5 }, (_, index) => ({
          day: index + 1,
          asset: ["attention_post", "warmup_stories", "carousel", "trust_post", "offer_post"][
            index
          ],
          instruction: `Publish step ${index + 1}.`,
        })),
        reel: {
          hook: "The September group needs more than another quiet launch.",
          script:
            "The September group is for women building a service business who want one practical place to begin. Here is what the program helps them do and where they can take the next step.",
          selfFilmedClipInstruction:
            "Film yourself closing your laptop, then look at the camera for 5 seconds.",
          brollClips: ["attention", "trust", "offer"].map((sourcePhotoId, index) => ({
            id: `clip-${index + 1}`,
            sourcePhotoId,
            motionPrompt:
              "Use a gentle camera push-in, natural blink, and soft ambient movement only.",
          })),
          overlayLines: ["The September group", "One practical place to begin", "Join us"],
          assembly: {
            clipOrder: ["clip-1", "self_filmed", "clip-2", "clip-3"],
            overlayPlacements: [
              { overlayLine: "The September group", overClipId: "clip-1" },
              { overlayLine: "One practical place to begin", overClipId: "self_filmed" },
              { overlayLine: "Join us", overClipId: "clip-3" },
            ],
            targetLengthSeconds: 22,
            audioType: "calm confident instrumental audio",
          },
          caption:
            "The September group gives women building a service business one practical place to begin.",
          cta: "Use your real link or keyword here.",
          corpusPatternId: "viral-dna:visible-transformation",
        },
      },
    })
    generateImageMock.mockResolvedValue(Buffer.from("png"))
    renderSlideMock.mockResolvedValue(Buffer.from("slide-png"))
    putMock.mockImplementation(async (_path: string) => ({
      url: `https://blob/${putMock.mock.calls.length}.png`,
    }))
    analyticsMock.mockResolvedValue({ ok: true })
  })

  it("dry-runs a test-mode order through the complete campaign and reel path, then stops for QA", async () => {
    const { generateCampaignOrder } = await import("@/lib/campaign-outcome/generator")
    await expect(generateCampaignOrder(51)).resolves.toEqual({ generated: true })
    expect(generateObjectMock).toHaveBeenCalledTimes(1)
    expect(generateImageMock).toHaveBeenCalledTimes(6)
    expect(renderSlideMock).toHaveBeenCalledTimes(17)
    expect(startVideoMock).toHaveBeenCalledTimes(3)
    expect(startVideoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "campaign-outcome",
        billingMode: "business",
      })
    )
    expect(putMock).toHaveBeenCalledTimes(23)
    expect(generateImageMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        referenceUrls: ["https://example.com/selfie.jpg"],
        size: "1024x1536",
        prompt: expect.stringContaining("Use exact facial features from the reference image."),
      })
    )
    const save = sqlMock.mock.calls.find(call => queryText(call).includes("status = 'needs_qa'"))
    expect(save).toBeTruthy()
    expect(queryText(save!)).toContain("campaign_data")
    const savedJson = String(
      save?.find(value => typeof value === "string" && value.includes("visualDirection"))
    )
    expect(savedJson).toContain('"photos"')
    expect(savedJson).toContain('"carousel"')
    expect(savedJson).toContain('"storySequences"')
    expect(savedJson).toContain('"publishPlan"')
    expect(savedJson).toContain('"reel"')
    expect(savedJson).toContain('"traceability"')
    const { isCampaignData } = await import("@/lib/campaign-outcome/types")
    expect(isCampaignData(JSON.parse(JSON.stringify(JSON.parse(savedJson))))).toBe(true)
    expect(analyticsMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "campaign_generated" })
    )
  })
})

describe("campaign outcome QA delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("status = 'delivered'") && query.includes("RETURNING *")) {
        return [
          {
            id: 61,
            user_id: null,
            customer_email: "qa@example.com",
            customer_name: "QA Buyer",
            access_token: "q".repeat(43),
            stripe_session_id: "cs_test_qa_delivery",
            status: "delivered",
            is_test_mode: true,
            delivery_email_sent_at: null,
          },
        ]
      }
      return []
    })
    analyticsMock.mockResolvedValue({ ok: true })
  })

  it("moves a test-mode generated order through QA to delivery without emailing a customer", async () => {
    const { deliverCampaignOrder } = await import("@/lib/campaign-outcome/delivery")
    await expect(deliverCampaignOrder(61)).resolves.toEqual({ delivered: true })
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(analyticsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "campaign_delivered",
        properties: { order_id: 61, is_test_mode: true },
      })
    )
  })
})
