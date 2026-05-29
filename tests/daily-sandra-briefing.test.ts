import { describe, expect, it } from "vitest"
import { buildDailySandraBriefing, generateDailySandraBriefingEmail } from "@/lib/admin/daily-sandra-briefing"

const baseReport = {
  generatedAt: "2026-05-29T08:00:00.000Z",
  windowDays: 7,
  eventCounts: {
    aiPromptOptins: 661,
    aiPromptAccessOpens: 510,
    freePromptCopies: 280,
    freeToVaultClicks: 40,
    vaultVisits: 201,
    checkoutStarts: 44,
    recoverySends: 8,
    vaultAccessOpens: 5,
    vaultPromptViews: 22,
    vaultPromptCopies: 18,
  },
  paymentCounts: {
    purchases: 6,
    revenueCents: 16200,
  },
  buyerCounts: {
    buyers: 6,
  },
  igCounts: {
    inboundMessages: 3,
    flagged: 1,
    agentDrafts: 1,
  },
  topGrowthTags: [{ tag: "prompt_request", count: 4 }],
  topPromptSignals: [{ prompt_title: "Dark Balcony Reel Cover Hero", prompt_number: "03", mood: "cinematic", views: 10, copies: 8 }],
  freePromptSignals: [{ prompt_title: "Coastal White", prompt_number: "01", copies: 7 }],
  attributionRows: [{ source: "instagram_manychat", utm_campaign: "prompt_my_selfie", checkout_starts: 12, purchases: 3 }],
}

describe("daily Sandra briefing", () => {
  it("builds the four-section morning brief", () => {
    const briefing = buildDailySandraBriefing(baseReport)

    expect(briefing.working.join(" ")).toContain("661 women joined")
    expect(briefing.postToday.join(" ")).toContain("Dark Balcony Reel Cover Hero")
    expect(briefing.postToday.join(" ")).toContain("PROMPT")
    expect(briefing.codexNext.length).toBeGreaterThan(0)
    expect(briefing.sandraNext.length).toBeGreaterThan(0)
  })

  it("calls out leaks when the free preview bridge is weak", () => {
    const briefing = buildDailySandraBriefing({
      ...baseReport,
      eventCounts: {
        ...baseReport.eventCounts,
        aiPromptAccessOpens: 500,
        freeToVaultClicks: 10,
      },
    })

    expect(briefing.leaking.join(" ")).toContain("free prompt access")
    expect(briefing.codexNext.join(" ")).toContain("free preview to Vault bridge")
  })

  it("generates calm email html and text", () => {
    const briefing = buildDailySandraBriefing(baseReport)
    const email = generateDailySandraBriefingEmail(briefing)

    expect(email.subject).toBe("today's SSELFIE briefing")
    expect(email.html).toContain("What's working")
    expect(email.html).toContain("What to post today")
    expect(email.text).toContain("What Codex should fix next")
  })

  it("turns problem tags into useful content instructions", () => {
    const briefing = buildDailySandraBriefing({
      ...baseReport,
      topGrowthTags: [{ tag: "confused", count: 3 }],
    })

    expect(briefing.postToday.join(" ")).toContain("solve confusion")
    expect(briefing.postToday.join(" ")).not.toContain('"confused"')
  })
})
