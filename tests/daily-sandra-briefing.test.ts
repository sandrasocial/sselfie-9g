import fs from "node:fs"
import path from "node:path"
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

const revenueScorecard = {
  generatedAt: "2026-07-01T08:00:00.000Z",
  sources: {
    activeMembersAndMrr: "Stripe live subscriptions via single-source",
    historicalRevenue: "stripe_payments",
    checkoutBehavior: "checkout_attribution",
    audienceBehavior: "analytics_events",
    workWithMePipeline: "brand_engine_applications",
  },
  members: {
    active: 8,
    netMrr: 490,
    netMrrByCurrency: { EUR: 97, USD: 393 },
    grossMrr: 878,
    grossMrrByCurrency: { EUR: 194, USD: 684 },
    discountedMembers: 5,
    new30d: 2,
    canceled30d: 1,
  },
  trials: {
    active: 5,
    expired: 3,
    claimed30d: 20,
    firstGeneration30d: 4,
    downloads30d: 2,
    paymentFormRendered30d: 1,
    converted: 1,
  },
  products30d: [],
  funnels30d: [],
  workWithMe: {
    applications30d: 3,
    qualifiedOpen: 2,
    bookedCalls: 0,
    paymentLinksSent: 0,
    won: 0,
    lost: 0,
  },
  demandSignals: {
    topInstagram: [],
    topFreePromptCopies: [{ title: "Noir Femme", copies: 44 }],
    topEmailConverters: [{ emailType: "prompt-vault-recovery", clicks: 9, conversions: 4 }],
  },
  notes: [
    "Payments are charge rows, not active members.",
    "Members are active Stripe subscriptions only.",
    "MRR is net of discounts.",
  ],
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
    expect(email.html).toContain("Today's move")
    expect(email.html).toContain("661 women joined")
    expect(email.text).toContain("Today's move")
  })

  // Cut 2026-07-09: "What's working"/"What's leaking" (4-item lists) and the 3-section
  // intelligence layer all restated the same numbers already shown in the truth blocks above.
  // Replaced by one compact "Today's move" block reusing the top already-computed signal.
  it("no longer renders the old four-item working/leaking sections", () => {
    const briefing = buildDailySandraBriefing(baseReport)
    const email = generateDailySandraBriefingEmail(briefing)

    expect(email.html).not.toContain("What's working")
    expect(email.html).not.toContain("What's leaking")
    expect(email.html).not.toContain("What to post today")
    expect(email.html).not.toContain("What Codex should fix next")
    expect(email.html).not.toContain("What Sandra does")
  })

  it("omits the customer threads section entirely when there are none, instead of a filler line", () => {
    const briefing = buildDailySandraBriefing(baseReport)
    expect(briefing.supportThreads).toHaveLength(0)
    const email = generateDailySandraBriefingEmail(briefing)

    expect(email.html).not.toContain("Customer threads")
    expect(email.html).not.toContain("No new customer support threads")
    expect(email.text).not.toContain("Customer threads")
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

  it("shows revenue truth separately from historical payments", () => {
    const briefing = buildDailySandraBriefing({
      ...baseReport,
      revenueScorecard,
    })
    const email = generateDailySandraBriefingEmail(briefing)

    expect(briefing.working.join(" ")).toContain("8 active Suite members")
    expect(briefing.working.join(" ")).toContain("€97 + $393 net MRR")
    expect(briefing.leaking.join(" ")).toContain("Suite trial activation is weak")
    expect(briefing.leaking.join(" ")).toContain("legacy attended application")
    expect(email.html).toContain("Revenue truth")
    expect(email.html).toContain("Payments are charge rows")
    expect(email.text).toContain("Members: 8 active · €97 + $393 net MRR")
    expect(email.text).toContain("Best free prompt: Noir Femme")
  })
})


describe("retired daily intelligence stays disconnected", () => {
  it("does not wire the daily cron to the retired LLM layer", () => {
    const cron = fs.readFileSync(
      path.join(process.cwd(), "app/api/cron/daily-sandra-briefing/route.ts"),
      "utf8",
    )

    expect(cron).not.toContain("generateDailyBriefingIntelligence")
    expect(cron).not.toContain("getYesterdayBriefingSnapshot")
    expect(cron).not.toContain("getLatestWeeklyContentBrief")
    expect(cron).not.toContain("storeDailyBriefingSnapshot")
  })

  it("registers the daily_sandra_briefing report type", () => {
    const reports = fs.readFileSync(path.join(process.cwd(), "lib/analytics/reports.ts"), "utf8")
    expect(reports).toContain('"daily_sandra_briefing"')
  })
})
