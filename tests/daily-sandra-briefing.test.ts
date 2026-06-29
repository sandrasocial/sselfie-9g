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
    checkoutCompleted: 6,
    checkoutRecoverableStarts: 30,
    checkoutUnrecoverableStarts: 14,
    manychatCheckoutStarts: 12,
    manychatUnrecoverableStarts: 7,
    recoverySends: 8,
    vaultAccessOpens: 5,
    vaultAccessOpeners: 5,
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

const truthSnapshot = {
  generatedAt: "2026-06-29T16:00:00.000Z",
  windowDays: 90,
  sources: {
    instagramProfile: "Instagram Graph API",
    instagramPerformance: "ig_media_snapshots",
    money: "stripe_payments",
    members: "subscriptions",
    email: "Resend Main Audience",
    manychat: "freebie_subscribers + stripe_payments",
  },
  instagram: {
    username: "sandra.social",
    followers: 110830,
    following: 816,
    mediaCount: 497,
    biography: "Selfie to Brand Shoot for women",
    website: "https://sselfie.ai/bio",
  },
  recentInstagram: {
    mediaCount: 31,
    latestCapturedOn: "2026-06-29",
    latestPostedAt: "2026-06-28T20:39:18.000Z",
    sumLatestPostReach: 941180,
    sumLatestPostViews: 1179224,
    sumLatestPostSaves: 42324,
    sumLatestPostShares: 10902,
    maxSinglePostReach: 488214,
    maxSinglePostViews: 604458,
    reachNote: "Sum of latest per-post reach snapshots, not unique account reach.",
  },
  email: { subscribedContacts: 6839 },
  suite: {
    activePaidMembers: 8,
    canceledMembers: 35,
    activeTrials: 14,
    expiredTrials: 24,
  },
  promptVault: {
    payments: 43,
    revenueCents: 118100,
    manychatAttributedPayments: 4,
    manychatAttributedRevenueCents: 10800,
  },
  manychat: {
    captures: 2960,
    captureToPromptVaultPurchaseRate: 1,
  },
  revenueByProduct: [],
  leaks: [
    "2960 ManyChat/email captures but only 43 Prompt Vault purchases in 90 days. Fix the DM/email to Vault offer before asking for more reach.",
  ],
  positioning: {
    currentPublicLane: "Turn one selfie into AI-assisted brand photos that still look like you.",
    avoid: ["Do not use stale follower, subscriber, member, MRR, or reach numbers from docs."],
  },
} as const

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

  it("uses distinct access openers instead of raw access events", () => {
    const briefing = buildDailySandraBriefing({
      ...baseReport,
      eventCounts: {
        ...baseReport.eventCounts,
        vaultAccessOpens: 20,
        vaultAccessOpeners: 1,
      },
      buyerCounts: {
        buyers: 6,
      },
    })

    expect(briefing.leaking.join(" ")).toContain("17% of buyer records opened Vault access")
  })

  it("generates calm email html and text", () => {
    const briefing = buildDailySandraBriefing(baseReport)
    const email = generateDailySandraBriefingEmail(briefing)

    expect(email.subject).toBe("today's SSELFIE briefing")
    expect(email.html).toContain("What's working")
    expect(email.html).toContain("What to post today")
    expect(email.text).toContain("What Codex should fix next")
  })

  it("puts the truth snapshot and real leak ahead of generic advice", () => {
    const briefing = buildDailySandraBriefing({
      ...baseReport,
      truthSnapshot,
    })
    const email = generateDailySandraBriefingEmail(briefing)

    expect(briefing.working.join(" ")).toContain("110,830 followers")
    expect(briefing.leaking[0]).toContain("2960 ManyChat/email captures")
    expect(briefing.codexNext.join(" ")).toContain("ManyChat PROMPT path")
    expect(email.html).toContain("Growth truth")
    expect(email.text).toContain("Email: 6,839 subscribed")
    expect(email.text).toContain("Sum of latest per-post reach snapshots")
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
