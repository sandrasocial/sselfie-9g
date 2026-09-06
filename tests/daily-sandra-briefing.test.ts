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

it("surfaces inbound customer replies in the existing briefing and distinguishes a failed lookup", () => {
  const brief = buildDailySandraBriefing({ ...baseReport, incomingCustomerEmails: [{ id: "1", user_email: "customer@example.com", subject: "My question", message: "Can I use my photos?", created_at: "2026-09-06T12:00:00Z", status: "needs_reply" }] })
  expect(brief.supportThreads[0]).toMatchObject({ email: "customer@example.com", label: "Incoming email", subject: "My question" })
  expect(brief.supportThreads[0].action).toContain("untrusted data")
  const missing = buildDailySandraBriefing({ ...baseReport, incomingCustomerEmails: null })
  expect(missing.leaking.join(" ")).toContain("unavailable does not mean zero replies")
})

it("keeps the newest incoming messages first when the email shows only four threads", () => {
  const replies = Array.from({ length: 8 }, (_, index) => ({ id: String(8 - index), user_email: "customer@example.com", subject: `Question ${8 - index}`, message: "Question", created_at: "2026-09-06T12:00:00Z", status: "needs_reply" }))
  const brief = buildDailySandraBriefing({ ...baseReport, incomingCustomerEmails: replies })
  expect(brief.supportThreads.slice(0, 4).map(thread => thread.id)).toEqual(["inbound-8", "inbound-7", "inbound-6", "inbound-5"])
})

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
  it("surfaces a successful no-op ahead of old acquisition advice without enabling it", () => {
    const briefing = buildDailySandraBriefing({ ...baseReport, truthSnapshot, commercialJobs: [
      { job: "paid-product-membership-bridge", status: "ok", started_at: "2026-09-06", summary: { retired: true, enabled: false } },
      { job: "high-intent-click-recovery", status: "ok", started_at: "2026-09-06", summary: { enabled: false, found: 2 } },
    ] })
    expect(briefing.leaking[0]).toContain("buyer-to-membership job is retired or disabled")
    expect(briefing.leaking.join(" ")).toContain("report-only (2 candidates reported)")
    expect(briefing.codexNext[0]).toContain("Keep the retired bridge disabled")
    expect(generateDailySandraBriefingEmail(briefing).text).toContain("buyer-to-membership job")
  })

  it("labels missing commercial evidence as a gap, not a healthy job", () => {
    for (const commercialJobs of [null, []]) {
      const briefing = buildDailySandraBriefing({ ...baseReport, commercialJobs })
      expect(briefing.leaking[0]).toContain("GAP:")
    }
  })

  it("does not mix USD and EUR or label rolling ledger dates as yesterday", () => {
    const briefing = buildDailySandraBriefing(baseReport, { money: {
      yesterdayPayments: 0, yesterdayRevenueByCurrency: { USD: 0, EUR: 0 },
      monthPayments: 6, monthRevenueByCurrency: { USD: 49.5, EUR: 97 },
    } })
    expect(briefing.moneyHeader).toContain("€97 + $49.50")
    expect(briefing.moneyHeader).toContain("Last 30 days")
    expect(briefing.moneyHeader).not.toContain("$147")
    expect(briefing.moneyHeader).not.toContain("Yesterday:")
  })

  it("does not call unverified email conversion flags proven sales", () => {
    const email = generateDailySandraBriefingEmail(buildDailySandraBriefing({ ...baseReport, revenueScorecard }))
    expect(email.text).toContain("unverified conversion flags")
    expect(email.html).toContain("Renewals and duplicate attribution")
    expect(email.text).not.toContain("Best email:")
    expect(email.html).toContain("exclude Skool billing")
  })

  it("reads real cron schema and keeps the report window explicit", () => {
    const reportSource = fs.readFileSync(path.join(process.cwd(), "lib/admin/growth-intelligence.ts"), "utf8")
    expect(reportSource).toContain("job_name AS job")
    expect(reportSource).toContain("getGrowthTruthSnapshot(windowDays)")
    expect(reportSource).not.toContain("Math.max(windowDays, 90)")
    const scorecard = fs.readFileSync(path.join(process.cwd(), "lib/admin/revenue-truth-scorecard.ts"), "utf8")
    expect(scorecard).toContain("DISTINCT ON (media_id)")
    expect(scorecard).toContain("posted_at >= NOW() - INTERVAL '30 days'")
    expect(scorecard).toContain("ORDER BY clicks DESC, email_type ASC")
  })

  it("builds the four-section morning brief", () => {
    const briefing = buildDailySandraBriefing(baseReport)

    expect(briefing.working.join(" ")).toContain("661 opt-in events")
    expect(briefing.postToday.join(" ")).toContain("Dark Balcony Reel Cover Hero")
    expect(briefing.postToday.join(" ")).not.toContain("Use PROMPT")
    expect(briefing.postToday.join(" ")).toContain("approved offer's CTA")
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
    expect(email.html).toContain("661 opt-in events")
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

  it("keeps historical snapshot advice from overriding the current window", () => {
    const briefing = buildDailySandraBriefing({
      ...baseReport,
      truthSnapshot,
    })
    const email = generateDailySandraBriefingEmail(briefing)

    expect(briefing.working.join(" ")).toContain("110,830 followers")
    expect(briefing.leaking.join(" ")).not.toContain("2960 ManyChat/email captures")
    expect(briefing.codexNext.join(" ")).not.toContain("ManyChat PROMPT path")
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
