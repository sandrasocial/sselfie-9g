// @vitest-environment node

import { existsSync, readFileSync } from "node:fs"
import { afterEach, describe, expect, it } from "vitest"

import { ALLOWED_ANALYTICS_EVENTS } from "@/lib/analytics/event-contract"
import { isCampaignOutcomeEnabled } from "@/lib/campaign-outcome/feature"
import { getProductById, PRODUCT_REVENUE_PATHS } from "@/lib/products"

const read = (path: string) => readFileSync(path, "utf8")
const priorFlag = process.env.CAMPAIGN_OUTCOME_DISABLED

afterEach(() => {
  if (priorFlag === undefined) delete process.env.CAMPAIGN_OUTCOME_DISABLED
  else process.env.CAMPAIGN_OUTCOME_DISABLED = priorFlag
})

describe("Your Next Campaign product contract", () => {
  it("fails closed until the held feature is deliberately enabled", () => {
    delete process.env.CAMPAIGN_OUTCOME_DISABLED
    expect(isCampaignOutcomeEnabled()).toBe(false)
    process.env.CAMPAIGN_OUTCOME_DISABLED = "true"
    expect(isCampaignOutcomeEnabled()).toBe(false)
    process.env.CAMPAIGN_OUTCOME_DISABLED = "false"
    expect(isCampaignOutcomeEnabled()).toBe(true)
  })

  it("registers one fixed $97 outcome without a subscription", () => {
    expect(getProductById("campaign_outcome")).toMatchObject({
      id: "campaign_outcome",
      type: "campaign_outcome",
      priceInCents: 9700,
      lifecycleStatus: "live",
    })
    expect(PRODUCT_REVENUE_PATHS.campaign_outcome).toMatchObject({
      checkoutPath: "/checkout/campaign",
      successNextAction: "/campaign/order/[token]",
    })

    const checkout = read("app/actions/landing-checkout.ts")
    expect(checkout).toContain('process.env.CAMPAIGN_OUTCOME_DISABLED !== "false"')
    expect(checkout).toContain('mode: isSubscription ? "subscription" : "payment"')
    expect(checkout).toContain('"inline-campaign-outcome-9700-usd"')
    expect(checkout).toContain('repeat_order_token: options?.repeatOrderToken?.trim() || ""')
    expect(read("lib/checkout/session-idempotency.ts")).toContain('"campaign_outcome"')
  })

  it("ships the complete tokenized buyer and admin path", () => {
    for (const path of [
      "app/campaign/page.tsx",
      "app/checkout/campaign/page.tsx",
      "app/campaign/order/[token]/page.tsx",
      "app/api/campaign/order/[token]/intake/route.ts",
      "app/api/campaign/order/[token]/event/route.ts",
      "app/admin/campaigns/page.tsx",
      "app/api/admin/campaigns/route.ts",
    ]) {
      expect(existsSync(path), path).toBe(true)
    }
    const intake = read("app/api/campaign/order/[token]/intake/route.ts")
    expect(intake).toContain("MAX_BYTES = 12 * 1024 * 1024")
    expect(intake).toContain("MIN_SHORT_SIDE = 512")
    expect(intake).toContain("after(async () =>")
    const admin = read("app/api/admin/campaigns/route.ts")
    expect(admin).toContain('"approve"')
    expect(admin).toContain('"regenerate"')
    expect(admin).toContain('"resend_delivery"')
    expect(admin).toContain("requireAdmin")
  })

  it("keeps one promotion complete and records every decision gate", () => {
    const generator = read("lib/campaign-outcome/generator.ts")
    expect(generator).toContain('z.enum(["attention", "trust", "offer"])')
    expect(generator).toContain("alternatePhotos")
    expect(generator).toContain(".length(7)")
    expect(generator).toContain('z.enum(["warmup", "offer"])')
    expect(generator).toContain(".length(5)")
    expect(generator).toContain("Use exact facial features from the reference image.")
    expect(generator).toContain("Never invent a personal story")

    const types = read("lib/campaign-outcome/types.ts")
    expect(types).toContain("photos: CampaignPhoto[]")
    expect(types).toContain("carousel: CampaignCarousel")
    expect(types).toContain("storySequences: CampaignStorySequence[]")
    expect(types).toContain("publishPlan: CampaignPublishDay[]")
    expect(types).toContain("reel: CampaignReel")
    expect(types).toContain("traceability: CampaignTraceability")

    for (const event of [
      "campaign_landing_view",
      "campaign_checkout_start",
      "campaign_purchase",
      "campaign_inputs_completed",
      "campaign_generated",
      "campaign_delivered",
      "campaign_downloaded",
      "campaign_published_confirmed",
      "campaign_repeat_purchase",
    ]) {
      expect(ALLOWED_ANALYTICS_EVENTS).toContain(event)
    }

    const campaignCheckout = read("app/checkout/campaign/page.tsx")
    const sharedCheckout = read("app/checkout/page.tsx")
    expect(campaignCheckout).not.toContain('eventName: "campaign_checkout_start"')
    expect(sharedCheckout).toContain(
      'if (productType === "campaign_outcome") return "campaign_checkout_start"'
    )
  })

  it("never creates an account or grants credits for the guest-safe campaign", () => {
    const handler = read("lib/payments/handlers/campaign-outcome.ts")
    expect(handler).not.toContain("user_credits")
    expect(handler).not.toContain("subscriptions")
    expect(handler).not.toContain("academy")
    expect(handler).not.toContain("createUser")

    const lifecycle = read("lib/payments/lifecycle/checkout-session-completed.ts")
    expect(lifecycle).toContain('productType === "campaign_outcome"')
    expect(lifecycle).toContain("handleCampaignOutcomeCheckout")
    expect(lifecycle).toContain("Campaign revenue recording failed")
    expect(read("app/api/webhooks/stripe/route.ts")).toContain(
      'case "checkout.session.async_payment_succeeded"'
    )
    const endpointSetup = read("scripts/stripe/fix-webhook-endpoints.ts")
    expect(endpointSetup).toContain('"checkout.session.async_payment_succeeded"')
    expect(endpointSetup).toContain("stripe.webhookEndpoints.update")
  })

  it("keeps subscription and course offers out of the test experience", () => {
    const landing = read("components/campaign/campaign-landing.tsx")
    const order = read("components/campaign/campaign-order-experience.tsx")
    expect(`${landing}\n${order}`).not.toMatch(/join suite|monthly membership|course access/i)
    expect(landing).toContain("One payment. No subscription.")
    expect(order).toContain("Another one-time purchase. No subscription.")
  })

  it("uses Sandra-approved campaign copy and removes internal wording", () => {
    const landing = read("components/campaign/campaign-landing.tsx")
    const order = read("components/campaign/campaign-order-experience.tsx")
    const emails = read("lib/campaign-outcome/emails.ts")
    const recovery = read("lib/campaign-outcome/recovery-emails.ts")
    const allCopy = `${landing}\n${order}\n${emails}\n${recovery}`

    expect(landing).toContain("For women building something of their own")
    expect(landing).toContain(
      "For the woman who knows what she's building and freezes when it's time to post."
    )
    expect(landing).toContain("If you don't recognize yourself in a photo, we redo it.")
    expect(landing).toContain("One reel, ready to assemble")
    expect(order).toContain("Tell Maya what you're promoting.")
    expect(order).toContain("Posted. That is exactly what this was for.")
    expect(order).toContain("No stress. Day one is the smallest step, start there.")
    expect(order).toContain("Call to action:")
    expect(emails).toContain("Start with post one today. It is marked at the top of your page.")
    expect(emails).toContain("No pressure either way, I just want to know if it helped.")
    expect(allCopy).not.toContain("five-day order")
    expect(allCopy).not.toContain("identity reference")
    expect(allCopy).not.toContain("admin queue")
    expect(order).not.toContain("window.location.reload()")
    expect(landing).not.toContain("border-l-2")
    expect(order).not.toContain("border-l-2")
  })

  it("keeps the campaign and its reel grounded and reviewable", () => {
    const generator = read("lib/campaign-outcome/generator.ts")
    const admin = read("components/admin/campaign-outcome-queue.tsx")
    const adminApi = read("app/api/admin/campaigns/route.ts")

    expect(generator).toContain("loadCampaignPatternCorpus")
    expect(generator).toContain("validateCampaignReelPlan")
    expect(generator).toContain("generateCampaignReelClips")
    expect(generator).toContain("overlayPlacements")
    expect(read("components/campaign/campaign-order-experience.tsx")).toContain(
      "Put each line here"
    )
    expect(admin).toContain("Reel traceability")
    expect(admin).toContain("Redo request rate")
    expect(admin).toContain("Refund request rate")
    expect(adminApi).toContain("record_redo_request")
    expect(adminApi).toContain("record_refund_request")
  })
})
