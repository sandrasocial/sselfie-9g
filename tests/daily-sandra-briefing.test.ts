import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { buildDailySandraBriefing, generateDailySandraBriefingEmail } from "@/lib/admin/daily-sandra-briefing"
import {
  buildDailyBriefingSnapshot,
  generateDailyBriefingIntelligence,
  getTodaysContentPost,
  sanitizeIntelligenceText,
} from "@/lib/admin/daily-briefing-intelligence"
import type { ContentBrief } from "@/lib/content-engine/brief-generator"

const { anthropicCreateMock } = vi.hoisted(() => ({ anthropicCreateMock: vi.fn() }))

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: (...args: unknown[]) => anthropicCreateMock(...args),
    }
  },
}))

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

  it("turns problem tags into useful content instructions", () => {
    const briefing = buildDailySandraBriefing({
      ...baseReport,
      topGrowthTags: [{ tag: "confused", count: 3 }],
    })

    expect(briefing.postToday.join(" ")).toContain("solve confusion")
    expect(briefing.postToday.join(" ")).not.toContain('"confused"')
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
    expect(briefing.leaking.join(" ")).toContain("Work With Me application")
    expect(email.html).toContain("Revenue truth")
    expect(email.html).toContain("Payments are charge rows")
    expect(email.text).toContain("Members: 8 active · €97 + $393 net MRR")
    expect(email.text).toContain("Best free prompt: Noir Femme")
  })
})

const intelligenceSections = {
  todaysMove: "Post the Tuesday reel from this week's brief. First frame shows the finished photo on your phone. It's engineered for shares. CTA: comment PROMPT.",
  whatChanged: "One new payment came in yesterday and one new trial claimed. Nothing else moved.",
  watchThis: "Trial first-generation rate got worse since yesterday. Watch the selfie upload step today.",
  todaysContentPost: null,
}

describe("getTodaysContentPost (deterministic, no AI paraphrase)", () => {
  // 2026-07-04: Sandra's real complaint - "what to post today" was an AI-summarized one-liner
  // that never even looked at the day's story sequence. This pulls the exact stored copy.
  const weeklyBrief = {
    contentPlan: [
      {
        day: "Wednesday",
        format: "reel",
        funnelStage: "cold",
        title: "The 3 selfies you need",
        hook: "hook",
        visualHook: "visual",
        onScreenText: ["line one", "line two"],
        caption: "Full caption text.",
        ctaKeyword: "PROMPT",
        whyThisWorks: "works",
      },
    ],
    dailyStories: [
      {
        day: "Wednesday",
        theme: "Behind the setup",
        conversationType: "my-story",
        sourceStoryTheme: "The bathroom studio",
        objective: "warm trust",
        offerMention: "Prompt Vault",
        ctaKeyword: "PROMPT",
        frames: [{ frame: 1, content: "frame one", interaction: "poll" }],
      },
    ],
  } as unknown as ContentBrief

  it("finds today's exact feed post and story sequence by matching weekday", () => {
    const result = getTodaysContentPost(weeklyBrief, new Date("2026-07-01T12:00:00Z")) // a Wednesday
    expect(result.weekday).toBe("Wednesday")
    expect(result.feedPost?.title).toBe("The 3 selfies you need")
    expect(result.feedPost?.caption).toBe("Full caption text.")
    expect(result.storySequence?.theme).toBe("Behind the setup")
    expect(result.storySequence?.frames).toHaveLength(1)
  })

  it("returns nulls, never a wrong day's piece, when today has no match", () => {
    const result = getTodaysContentPost(weeklyBrief, new Date("2026-07-02T12:00:00Z")) // a Thursday
    expect(result.weekday).toBe("Thursday")
    expect(result.feedPost).toBeNull()
    expect(result.storySequence).toBeNull()
  })

  it("returns nulls for an empty or old-shape brief instead of throwing", () => {
    expect(getTodaysContentPost(null).feedPost).toBeNull()
    expect(getTodaysContentPost({ contentPlan: [] } as unknown as ContentBrief).feedPost).toBeNull()
  })
})

describe("daily briefing intelligence path", () => {
  it("builds the briefing with no intelligence attached by default", () => {
    const briefing = buildDailySandraBriefing(baseReport)
    expect(briefing.intelligence).toBeNull()
    expect(briefing.intelligenceNote).toBeNull()
  })

  // 2026-07-09: the email renderer was decoupled from `briefing.intelligence` entirely (see
  // "no longer renders the old four-item working/leaking sections" above) — daily-briefing-
  // intelligence.ts's generation functions are tested directly below (still present, slated for
  // removal alongside the rest of the retired weekly-brief pipeline once its Cowork replacement
  // is proven) but no longer affect what the email actually renders.

  it("strips m-dashes and banned words from intelligence text", () => {
    const cleaned = sanitizeIntelligenceText("Leverage this — it will unlock an elevated result")
    expect(cleaned).not.toContain("—")
    expect(cleaned.toLowerCase()).not.toContain("leverage")
    expect(cleaned.toLowerCase()).not.toContain("unlock")
    expect(cleaned.toLowerCase()).not.toContain("elevated")
  })
})

describe("daily briefing intelligence generation (mocked API)", () => {
  const weeklyBrief = {
    contentPlan: [
      {
        day: "Tuesday",
        format: "reel",
        funnelStage: "cold",
        engineeredFor: "share",
        engagementMechanic: "Forwardable before/after truth.",
        title: "One selfie, full shoot",
        hook: "You don't need a photographer for this",
        visualHook: "Finished photo fills the frame, phone lowers to reveal her real face.",
        onScreenText: ["Still you", "One selfie"],
        whyThisWorks: "Top copied prompt signal.",
      },
    ],
  } as unknown as ContentBrief

  const toolResponse = (input: Record<string, string>, stopReason = "tool_use") => ({
    stop_reason: stopReason,
    content: [{ type: "tool_use", id: "t1", name: "deliver_daily_intelligence", input }],
  })

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key"
    anthropicCreateMock.mockReset()
  })

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  it("returns the three sections from the model", async () => {
    anthropicCreateMock.mockResolvedValueOnce(toolResponse(intelligenceSections))
    const briefing = buildDailySandraBriefing(baseReport)

    const result = await generateDailyBriefingIntelligence({
      briefing,
      weeklyBrief,
      yesterday: null,
      now: new Date("2026-06-30T12:00:00Z"),
    })

    expect(anthropicCreateMock).toHaveBeenCalledTimes(1)
    expect(result.todaysMove).toContain("Tuesday reel")
    expect(result.whatChanged).toContain("new payment")
    expect(result.watchThis).toContain("first-generation")
  })

  it("says plainly when the weekly brief has no content plan instead of emitting filler", async () => {
    anthropicCreateMock.mockResolvedValueOnce(toolResponse(intelligenceSections))
    const briefing = buildDailySandraBriefing(baseReport)

    const result = await generateDailyBriefingIntelligence({ briefing, weeklyBrief: null, yesterday: null })

    expect(result.todaysMove).toContain("no matching post for today")
    expect(result.todaysMove).toContain("Regenerate")
    expect(result.todaysContentPost.feedPost).toBeNull()
  })

  it("retries once on max_tokens, then succeeds", async () => {
    anthropicCreateMock
      .mockResolvedValueOnce(toolResponse(intelligenceSections, "max_tokens"))
      .mockResolvedValueOnce(toolResponse(intelligenceSections))
    const briefing = buildDailySandraBriefing(baseReport)

    const result = await generateDailyBriefingIntelligence({
      briefing,
      weeklyBrief,
      yesterday: null,
      now: new Date("2026-06-30T12:00:00Z"),
    })

    expect(anthropicCreateMock).toHaveBeenCalledTimes(2)
    expect(result.watchThis).toBeTruthy()
  })

  it("throws when truncated twice so the cron falls back to the template", async () => {
    anthropicCreateMock
      .mockResolvedValueOnce(toolResponse(intelligenceSections, "max_tokens"))
      .mockResolvedValueOnce(toolResponse(intelligenceSections, "max_tokens"))
    const briefing = buildDailySandraBriefing(baseReport)

    await expect(
      generateDailyBriefingIntelligence({ briefing, weeklyBrief, yesterday: null }),
    ).rejects.toThrow(/truncated/)
  })

  it("throws when a section comes back empty", async () => {
    anthropicCreateMock.mockResolvedValueOnce(toolResponse({ ...intelligenceSections, watchThis: "" }))
    const briefing = buildDailySandraBriefing(baseReport)

    await expect(
      generateDailyBriefingIntelligence({ briefing, weeklyBrief, yesterday: null }),
    ).rejects.toThrow(/empty section/)
  })

  it("throws without an API key so the cron falls back to the template", async () => {
    delete process.env.ANTHROPIC_API_KEY
    const briefing = buildDailySandraBriefing(baseReport)

    await expect(
      generateDailyBriefingIntelligence({ briefing, weeklyBrief, yesterday: null }),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/)
  })
})

describe("daily briefing snapshot storage", () => {
  it("builds a compact snapshot with real metrics and today's sections", () => {
    const briefing = {
      ...buildDailySandraBriefing({ ...baseReport, truthSnapshot, revenueScorecard }),
      intelligence: intelligenceSections,
      intelligenceNote: null,
    }
    const snapshot = buildDailyBriefingSnapshot(briefing, {
      yesterdayPayments: 2,
      yesterdayRevenue: 74,
      monthPayments: 19,
      monthRevenue: 812,
    })

    expect(snapshot.metrics.yesterdayPayments).toBe(2)
    expect(snapshot.metrics.followers).toBe(110830)
    expect(snapshot.metrics.activePaidMembers).toBe(8)
    expect(snapshot.metrics.trialsFirstGeneration30d).toBe(4)
    expect(snapshot.metrics.flaggedDmCount).toBe(0)
    expect(snapshot.sections.todaysMove).toContain("Tuesday reel")
    expect(snapshot.sections.leaking.length).toBeGreaterThan(0)
  })

  // 2026-07-09: retired. The daily cron no longer makes its own LLM call for "today's move" —
  // that fragile fresh-API-call-every-morning layer (which silently degraded to a canned
  // fallback whenever the Anthropic account hit a billing issue) is replaced by a compact line
  // reusing the already-deterministic working/leaking signal (see todaysMoveHtml).
  it("no longer wires the cron to the retired daily intelligence LLM layer", () => {
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
