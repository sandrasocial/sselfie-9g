import type { GrowthTruthSnapshot } from "@/lib/admin/growth-truth"
import type { RevenueTruthScorecard } from "@/lib/admin/revenue-truth-scorecard"
import type { ApprovalActionSummary } from "@/lib/admin/action-queue"

type ReportRow = {
  [key: string]: unknown
  tag?: string | null
  prompt_title?: string | null
  checkout_starts?: number | null
  purchases?: number | null
  utm_campaign?: string | null
  source?: string | null
}

type GrowthReportLike = {
  generatedAt: string
  windowDays: number
  eventCounts: {
    aiPromptOptins: number
    aiPromptAccessOpens: number
    freePromptCopies: number
    freeToVaultClicks: number
    vaultVisits: number
    checkoutStarts: number
    checkoutCompleted: number
    checkoutRecoverableStarts: number
    checkoutUnrecoverableStarts: number
    manychatCheckoutStarts: number
    manychatUnrecoverableStarts: number
    recoverySends: number
    vaultAccessOpens: number
    vaultAccessOpeners: number
    vaultPromptViews: number
    vaultPromptCopies: number
  }
  paymentCounts: {
    purchases: number
    revenueCents: number
  }
  buyerCounts: {
    buyers: number
  }
  supportCounts?: {
    total: number
    new: number
    reviewing: number
    resolved: number
    bugs: number
  }
  recentSupportThreads?: Array<{
    id?: string | null
    user_name?: string | null
    user_email?: string | null
    type?: string | null
    subject?: string | null
    message?: string | null
    status?: string | null
    created_at?: string | null
    replied_at?: string | null
    admin_reply?: string | null
  }>
  topPromptSignals: ReportRow[]
  freePromptSignals: ReportRow[]
  attributionRows: ReportRow[]
  truthSnapshot?: GrowthTruthSnapshot | null
  revenueScorecard?: RevenueTruthScorecard | null
}

export type DailyBriefingExtras = {
  money?: {
    yesterdayPayments: number
    yesterdayRevenue: number
    monthPayments: number
    monthRevenue: number
  }
  approvalActions?: ApprovalActionSummary[]
}

export type DailySandraBriefing = {
  generatedAt: string
  windowDays: number
  subject: string
  moneyHeader: string | null
  truthSnapshot: GrowthTruthSnapshot | null
  revenueScorecard: RevenueTruthScorecard | null
  working: string[]
  leaking: string[]
  postToday: string[]
  codexNext: string[]
  sandraNext: string[]
  supportThreads: Array<{
    id: string
    customer: string
    email: string
    label: string
    subject: string
    message: string
    status: string
    action: string
    createdAt?: string | null
  }>
  approvalActions: ApprovalActionSummary[]
  links: {
    growthIntelligence: string
    promptVault: string
    customerSupport: string
  }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 100)
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

function currencyMoney(value: number, currency: string): string {
  const normalized = currency.toUpperCase()
  const symbol = normalized === "EUR" ? "€" : normalized === "USD" ? "$" : `${normalized} `
  return `${symbol}${value.toFixed(0)}`
}

function currencyBreakdown(values: Record<string, number> | null | undefined): string {
  const entries = Object.entries(values || {}).filter(([, value]) => Number(value) > 0)
  if (entries.length === 0) return "$0"
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, value]) => currencyMoney(value, currency))
    .join(" + ")
}

function compactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "n/a"
  return value.toLocaleString("en-US")
}

function cleanLabel(value: unknown, fallback = "the strongest current visual angle"): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function previewText(value: unknown, fallback = "No message preview"): string {
  if (typeof value !== "string") return fallback
  const clean = value.replace(/\s+/g, " ").trim()
  if (!clean) return fallback
  return clean.length > 220 ? `${clean.slice(0, 217)}...` : clean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildDailySandraBriefing(
  report: GrowthReportLike,
  extras: DailyBriefingExtras = {},
): DailySandraBriefing {
  const purchases = report.paymentCounts.purchases
  const buyers = report.buyerCounts.buyers || purchases
  const checkoutRate = percent(report.eventCounts.checkoutStarts, report.eventCounts.vaultVisits)
  const purchaseRate = percent(purchases, report.eventCounts.checkoutStarts)
  const freeBridgeRate = percent(report.eventCounts.freeToVaultClicks, report.eventCounts.aiPromptAccessOpens)
  const unrecoverableCheckoutRate = percent(
    report.eventCounts.checkoutUnrecoverableStarts,
    report.eventCounts.checkoutStarts,
  )
  const manychatUnrecoverableRate = percent(
    report.eventCounts.manychatUnrecoverableStarts,
    report.eventCounts.manychatCheckoutStarts,
  )
  const distinctAccessOpeners = report.eventCounts.vaultAccessOpeners || 0
  const accessRate = percent(distinctAccessOpeners, buyers)
  const copiesPerBuyer = buyers ? report.eventCounts.vaultPromptCopies / buyers : 0
  const topPaidPrompt = report.topPromptSignals[0]
  const topFreePrompt = report.freePromptSignals[0]
  const topAttribution = report.attributionRows[0]
  const topVisual = cleanLabel(topPaidPrompt?.prompt_title || topFreePrompt?.prompt_title)
  const supportThreads = (report.recentSupportThreads || []).map((thread) => {
    const status = cleanLabel(thread.status, "new")
    const subject = cleanLabel(thread.subject, "Customer support message")
    return {
      id: cleanLabel(thread.id, "support-thread"),
      customer: cleanLabel(thread.user_name, "Customer"),
      email: cleanLabel(thread.user_email, "No email"),
      label: cleanLabel(thread.type, "support"),
      subject,
      message: previewText(thread.message),
      status,
      action:
        status === "resolved"
          ? "Already replied. Watch for follow-up."
          : thread.type === "bug"
            ? "Codex should inspect this before Sandra sends a final reply."
            : "Sandra should review and reply from customer support.",
      createdAt: thread.created_at,
    }
  })

  const working: string[] = []
  const leaking: string[] = []
  const postToday: string[] = []
  const codexNext: string[] = []
  const sandraNext: string[] = []

  if (report.eventCounts.aiPromptOptins > 0) {
    working.push(`${report.eventCounts.aiPromptOptins} women joined the AI prompt funnel in the last ${report.windowDays} days.`)
  }

  if (report.truthSnapshot?.instagram.followers) {
    working.push(
      `Instagram truth: @${report.truthSnapshot.instagram.username} has ${compactNumber(report.truthSnapshot.instagram.followers)} followers and ${compactNumber(report.truthSnapshot.recentInstagram.sumLatestPostReach)} summed latest per-post reach in the ${report.truthSnapshot.windowDays}-day snapshot.`,
    )
  }

  if (report.revenueScorecard) {
    working.push(
      `Revenue truth: ${report.revenueScorecard.members.active} active Suite members, ${currencyBreakdown(report.revenueScorecard.members.netMrrByCurrency)} net MRR, ${report.revenueScorecard.members.discountedMembers} discounted.`,
    )
    working.push(
      `Trial activation: ${report.revenueScorecard.trials.claimed30d} claimed in 30 days, ${report.revenueScorecard.trials.firstGeneration30d} reached first generation, ${report.revenueScorecard.trials.paymentFormRendered30d} reached payment form.`,
    )
  }

  if (report.eventCounts.checkoutStarts > 0) {
    working.push(`${report.eventCounts.checkoutStarts} people started Prompt Vault checkout from ${report.eventCounts.vaultVisits} Vault visits (${checkoutRate}%).`)
  }

  if (purchases > 0) {
    working.push(`${purchases} Prompt Vault purchases came through for ${money(report.paymentCounts.revenueCents)} in tracked revenue.`)
  }

  if (report.eventCounts.vaultPromptCopies > 0) {
    working.push(`Buyers copied ${report.eventCounts.vaultPromptCopies} Vault prompts (${copiesPerBuyer.toFixed(1)} per buyer). That is the product-fit signal to keep watching.`)
  }

  if (working.length === 0) {
    working.push("The tracking layer is ready, but there is not enough fresh movement in this window yet.")
  }

  if (report.eventCounts.aiPromptAccessOpens > 0 && freeBridgeRate < 12) {
    leaking.push(`Only ${freeBridgeRate}% of free prompt access opens clicked into the Vault. The preview-to-paid bridge needs the most attention.`)
  }

  if (report.revenueScorecard && report.revenueScorecard.trials.claimed30d > 0) {
    const firstGenerationRate = percent(
      report.revenueScorecard.trials.firstGeneration30d,
      report.revenueScorecard.trials.claimed30d,
    )
    if (firstGenerationRate < 60) {
      leaking.push(
        `Suite trial activation is weak: ${firstGenerationRate}% reached first generation. Fix this before pushing more membership traffic.`,
      )
    }
  }

  if (report.revenueScorecard && report.revenueScorecard.workWithMe.applications30d > 0) {
    if (report.revenueScorecard.workWithMe.bookedCalls === 0 && report.revenueScorecard.workWithMe.won === 0) {
      leaking.push(
        `${report.revenueScorecard.workWithMe.applications30d} legacy attended application(s) came in, but none are marked booked or won. Complete those existing inquiries without restoring the path as a public offer.`,
      )
    }
  }

  if (report.eventCounts.vaultVisits >= 50 && checkoutRate < 8) {
    leaking.push(`Vault visits are not turning into enough checkout starts yet (${checkoutRate}%). The paid offer moment may need a sharper CTA.`)
  }

  if (report.eventCounts.checkoutStarts >= 5 && purchaseRate < 10) {
    leaking.push(`Checkout intent exists, but only ${purchaseRate}% completed purchase. Watch recovery emails, payment issues, and price-friction language.`)
  }

  if (report.eventCounts.checkoutStarts >= 5 && unrecoverableCheckoutRate >= 25) {
    leaking.push(`${unrecoverableCheckoutRate}% of active checkout starts have no email attached yet. Those abandoners are harder to recover.`)
  }

  if (report.eventCounts.manychatCheckoutStarts >= 3 && manychatUnrecoverableRate >= 25) {
    leaking.push(`${manychatUnrecoverableRate}% of ManyChat checkout starts are unrecoverable before Stripe captures email. Use direct checkout only for warm follow-up clicks.`)
  }

  if (buyers > 0 && accessRate < 70) {
    leaking.push(`Only ${accessRate}% of buyer records opened Vault access. Delivery/access clarity may be leaking activation.`)
  }

  if ((report.supportCounts?.new || 0) > 0) {
    leaking.push(`${report.supportCounts?.new} new customer support thread${report.supportCounts?.new === 1 ? "" : "s"} need review. Keep support inside the customer support inbox so issues do not get lost in email.`)
  }

  if (leaking.length === 0) {
    leaking.push("No major leak is obvious in this window. Keep sending qualified traffic and watch the next 24 hours.")
  }

  if (report.truthSnapshot?.leaks?.length) {
    leaking.unshift(...report.truthSnapshot.leaks)
  }

  postToday.push(`Post one Prompt My Selfie reel around ${topVisual}. Make the first second show the finished transformation, not the explanation.`)

  postToday.push("Use PROMPT as the CTA when the post teaches AI-photo prompts, then judge it from measured clicks and copies.")

  postToday.push("Send story traffic directly to the free preview or Vault with clean UTM tracking.")

  sandraNext.push("Choose today's reel angle from the strongest visual signal above.")
  sandraNext.push("Review Customer Support for objections, bugs, and requests.")
  sandraNext.push("Keep posting transformation proof before teaching the prompt mechanics.")

  if ((report.supportCounts?.new || 0) > 0 || (report.supportCounts?.reviewing || 0) > 0) {
    codexNext.push("Triage open customer support threads and fix any product bugs before optimizing more funnel copy.")
  } else if (
    report.revenueScorecard &&
    report.revenueScorecard.trials.claimed30d > 0 &&
    percent(report.revenueScorecard.trials.firstGeneration30d, report.revenueScorecard.trials.claimed30d) < 60
  ) {
    codexNext.push("Fix Suite trial activation: first selfie upload, first generation, and download must be the obvious path.")
  } else if (
    report.revenueScorecard &&
    report.revenueScorecard.workWithMe.applications30d > 0 &&
    report.revenueScorecard.workWithMe.bookedCalls === 0
  ) {
    codexNext.push("Protect the existing attended inquiries and keep their status accurate. Do not rebuild or publicly promote the legacy path.")
  } else if (
    report.truthSnapshot &&
    report.truthSnapshot.manychat.captures >= 100 &&
    report.truthSnapshot.manychat.captureToPromptVaultPurchaseRate < 3
  ) {
    codexNext.push("Audit and tighten the ManyChat PROMPT path: delivered promise, email capture, Vault offer, checkout URL, and follow-up sequence.")
  } else if (report.truthSnapshot && report.truthSnapshot.suite.activeTrials > 0) {
    codexNext.push("Fix Suite trial activation: make first selfie upload and first generated result the obvious next step for every active trial.")
  } else if (report.eventCounts.aiPromptAccessOpens > 0 && freeBridgeRate < 12) {
    codexNext.push("Improve the free preview to Vault bridge after the first prompt copy.")
  } else if (report.eventCounts.manychatCheckoutStarts >= 3 && manychatUnrecoverableRate >= 25) {
    codexNext.push("Tighten the ManyChat checkout path so more direct-checkout visitors arrive with a recoverable email.")
  } else if (topAttribution && Number(topAttribution.checkout_starts || 0) > 0 && Number(topAttribution.purchases || 0) === 0) {
    codexNext.push(`Audit the ${cleanLabel(topAttribution.utm_campaign || topAttribution.source, "top traffic source")} path because it starts checkout without purchases.`)
  } else if (buyers > 0 && accessRate < 70) {
    codexNext.push("Audit Prompt Vault delivery/access flow and recovery links.")
  } else {
    codexNext.push("No urgent code fix. Monitor attribution and prompt copies before building another product layer.")
  }

  codexNext.push("Pull the Growth Intelligence report again tomorrow and compare the same four sections.")

  const moneyHeader = extras.money
    ? `Yesterday: ${extras.money.yesterdayPayments} payments, $${extras.money.yesterdayRevenue.toFixed(0)}. This month: ${extras.money.monthPayments} payments, $${extras.money.monthRevenue.toFixed(0)}.`
    : null

  return {
    generatedAt: report.generatedAt,
    windowDays: report.windowDays,
    subject: "today's SSELFIE briefing",
    moneyHeader,
    truthSnapshot: report.truthSnapshot || null,
    revenueScorecard: report.revenueScorecard || null,
    working: working.slice(0, 4),
    leaking: leaking.slice(0, 4),
    postToday: postToday.slice(0, 3),
    codexNext: codexNext.slice(0, 3),
    sandraNext: sandraNext.slice(0, 3),
    supportThreads,
    approvalActions: (extras.approvalActions || []).slice(0, 5),
    links: {
      growthIntelligence: `${SITE_URL}/admin`,
      promptVault: `${SITE_URL}/admin/prompt-vault`,
      customerSupport: `${SITE_URL}/admin/customer-support`,
    },
  }
}

function supportThreadsHtml(threads: DailySandraBriefing["supportThreads"]): string {
  if (threads.length === 0) {
    return `<p style="margin:0;color:#4F5052;font-size:14px;line-height:1.7;">No new customer support threads in this window.</p>`
  }

  return threads
    .slice(0, 4)
    .map((thread) => {
      const supportUrl = `${SITE_URL}/admin/customer-support?q=${encodeURIComponent(thread.email)}`
      return `
        <div style="border-top:1px solid rgba(197,198,200,.45);padding:14px 0 0;margin:14px 0 0;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#818283;">${escapeHtml(thread.label)} · ${escapeHtml(thread.status)}</p>
          <p style="margin:0 0 6px;font-size:15px;color:#0D0E10;font-weight:600;">${escapeHtml(thread.subject)}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#4F5052;line-height:1.6;">${escapeHtml(thread.customer)} · ${escapeHtml(thread.email)}</p>
          <p style="margin:0 0 10px;font-size:14px;color:#4F5052;line-height:1.7;">${escapeHtml(thread.message)}</p>
          <p style="margin:0 0 10px;font-size:13px;color:#818283;line-height:1.6;">${escapeHtml(thread.action)}</p>
          <a href="${supportUrl}" style="color:#0D0E10;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">Open thread</a>
        </div>`
    })
    .join("")
}

function supportThreadsText(threads: DailySandraBriefing["supportThreads"]): string {
  if (threads.length === 0) return "- No new customer support threads in this window."
  return threads
    .slice(0, 4)
    .map((thread) => `- [${thread.status}] ${thread.subject} from ${thread.customer} <${thread.email}>: ${thread.message} Action: ${thread.action}`)
    .join("\n")
}

function truthSnapshotHtml(snapshot: GrowthTruthSnapshot | null): string {
  if (!snapshot) return ""

  const rows = [
    ["Instagram", `${compactNumber(snapshot.instagram.followers)} followers · ${compactNumber(snapshot.instagram.mediaCount)} posts`, snapshot.sources.instagramProfile],
    ["Recent IG", `${compactNumber(snapshot.recentInstagram.sumLatestPostReach)} summed reach · ${compactNumber(snapshot.recentInstagram.sumLatestPostViews)} views`, snapshot.sources.instagramPerformance],
    ["ManyChat", `${compactNumber(snapshot.manychat.captures)} captures · ${snapshot.manychat.captureToPromptVaultPurchaseRate}% to Prompt Vault purchase`, snapshot.sources.manychat],
    ["Prompt Vault", `${compactNumber(snapshot.promptVault.payments)} purchases · ${money(snapshot.promptVault.revenueCents)}`, snapshot.sources.money],
    ["Suite", `${compactNumber(snapshot.suite.activePaidMembers)} paid · ${compactNumber(snapshot.suite.activeTrials)} trials`, snapshot.sources.members],
    [
      "Email",
      snapshot.email.subscribedContacts == null
        ? "not fetched in fast snapshot"
        : `${compactNumber(snapshot.email.subscribedContacts)} subscribed`,
      snapshot.sources.email,
    ],
  ]

  return `
      <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 14px;">
        <h2 style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;">Growth truth · real sources</h2>
        ${rows.map(([label, value, source]) => `
          <p style="margin:0 0 8px;font-size:14px;color:#4F5052;line-height:1.6;">
            <strong style="color:#0D0E10;">${escapeHtml(label)}</strong> · ${escapeHtml(value)} <span style="color:#9A9A9A;">source: ${escapeHtml(source)}</span>
          </p>
        `).join("")}
        <p style="margin:10px 0 0;font-size:12px;color:#818283;line-height:1.6;">${escapeHtml(snapshot.recentInstagram.reachNote)}</p>
      </div>`
}

function truthSnapshotText(snapshot: GrowthTruthSnapshot | null): string {
  if (!snapshot) return ""
  return `\n\nGrowth truth\n- Instagram: ${compactNumber(snapshot.instagram.followers)} followers · ${compactNumber(snapshot.instagram.mediaCount)} posts (${snapshot.sources.instagramProfile})\n- Recent IG: ${compactNumber(snapshot.recentInstagram.sumLatestPostReach)} summed reach · ${compactNumber(snapshot.recentInstagram.sumLatestPostViews)} views (${snapshot.sources.instagramPerformance}; ${snapshot.recentInstagram.reachNote})\n- ManyChat: ${compactNumber(snapshot.manychat.captures)} captures · ${snapshot.manychat.captureToPromptVaultPurchaseRate}% to Prompt Vault purchase (${snapshot.sources.manychat})\n- Prompt Vault: ${compactNumber(snapshot.promptVault.payments)} purchases · ${money(snapshot.promptVault.revenueCents)} (${snapshot.sources.money})\n- Suite: ${compactNumber(snapshot.suite.activePaidMembers)} paid · ${compactNumber(snapshot.suite.activeTrials)} trials (${snapshot.sources.members})\n- Email: ${snapshot.email.subscribedContacts == null ? "not fetched in fast snapshot" : `${compactNumber(snapshot.email.subscribedContacts)} subscribed`} (${snapshot.sources.email})`
}

function revenueScorecardHtml(scorecard: RevenueTruthScorecard | null): string {
  if (!scorecard) return ""

  const topEmail = scorecard.demandSignals.topEmailConverters[0]
  const topPrompt = scorecard.demandSignals.topFreePromptCopies[0]
  const rows = [
    ["Members", `${compactNumber(scorecard.members.active)} active · ${currencyBreakdown(scorecard.members.netMrrByCurrency)} net MRR · ${compactNumber(scorecard.members.discountedMembers)} discounted`, scorecard.sources.activeMembersAndMrr],
    ["Trials", `${compactNumber(scorecard.trials.claimed30d)} claimed · ${compactNumber(scorecard.trials.firstGeneration30d)} first generations · ${compactNumber(scorecard.trials.downloads30d)} downloads`, scorecard.sources.audienceBehavior],
    ["Legacy attended inquiries", `${compactNumber(scorecard.workWithMe.applications30d)} applications · ${compactNumber(scorecard.workWithMe.qualifiedOpen)} qualified/open · ${compactNumber(scorecard.workWithMe.bookedCalls)} booked · ${compactNumber(scorecard.workWithMe.won)} won`, scorecard.sources.workWithMePipeline],
    [
      "Best email",
      topEmail
        ? `${topEmail.emailType} · ${compactNumber(topEmail.clicks)} clicks · ${compactNumber(topEmail.conversions)} conversions`
        : "no converting email signal yet",
      "email_logs",
    ],
    [
      "Best free prompt",
      topPrompt ? `${topPrompt.title} · ${compactNumber(topPrompt.copies)} copies` : "no prompt-copy signal yet",
      scorecard.sources.audienceBehavior,
    ],
  ]

  return `
      <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 14px;">
        <h2 style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;">Revenue truth · decision metrics</h2>
        ${rows.map(([label, value, source]) => `
          <p style="margin:0 0 8px;font-size:14px;color:#4F5052;line-height:1.6;">
            <strong style="color:#0D0E10;">${escapeHtml(label)}</strong> · ${escapeHtml(value)} <span style="color:#9A9A9A;">source: ${escapeHtml(source)}</span>
          </p>
        `).join("")}
        <p style="margin:10px 0 0;font-size:12px;color:#818283;line-height:1.6;">Payments are charge rows. Members are active Stripe subscriptions. MRR is net of discounts.</p>
      </div>`
}

function revenueScorecardText(scorecard: RevenueTruthScorecard | null): string {
  if (!scorecard) return ""
  const topEmail = scorecard.demandSignals.topEmailConverters[0]
  const topPrompt = scorecard.demandSignals.topFreePromptCopies[0]
  return `\n\nRevenue truth\n- Members: ${compactNumber(scorecard.members.active)} active · ${currencyBreakdown(scorecard.members.netMrrByCurrency)} net MRR · ${compactNumber(scorecard.members.discountedMembers)} discounted (${scorecard.sources.activeMembersAndMrr})\n- Trials: ${compactNumber(scorecard.trials.claimed30d)} claimed · ${compactNumber(scorecard.trials.firstGeneration30d)} first generations · ${compactNumber(scorecard.trials.downloads30d)} downloads (${scorecard.sources.audienceBehavior})\n- Legacy attended inquiries: ${compactNumber(scorecard.workWithMe.applications30d)} applications · ${compactNumber(scorecard.workWithMe.qualifiedOpen)} qualified/open · ${compactNumber(scorecard.workWithMe.bookedCalls)} booked · ${compactNumber(scorecard.workWithMe.won)} won (${scorecard.sources.workWithMePipeline})\n- Best email: ${topEmail ? `${topEmail.emailType} · ${compactNumber(topEmail.clicks)} clicks · ${compactNumber(topEmail.conversions)} conversions` : "no converting email signal yet"}\n- Best free prompt: ${topPrompt ? `${topPrompt.title} · ${compactNumber(topPrompt.copies)} copies` : "no prompt-copy signal yet"}\n- Labels: payments are charge rows; members are active Stripe subscriptions; MRR is net of discounts.`
}

/** Compact "today's move" line — reuses the top already-computed working/leaking signal
 *  instead of a separate LLM call or four-item lists. Cut 2026-07-09: the old three-section
 *  intelligence layer plus separate What's Working/What's Leaking lists all restated the same
 *  numbers already shown in the truth blocks above; this is the one line that's left. */
function todaysMoveHtml(briefing: DailySandraBriefing): string {
  const working = briefing.working[0]
  const leaking = briefing.leaking[0]
  if (!working && !leaking) return ""
  return `
      <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 14px;">
        <h2 style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;">Today's move</h2>
        ${working ? `<p style="margin:0 0 8px;color:#0D0E10;font-size:14px;line-height:1.7;">${escapeHtml(working)}</p>` : ""}
        ${leaking ? `<p style="margin:0;color:#4F5052;font-size:14px;line-height:1.7;">Watch: ${escapeHtml(leaking)}</p>` : ""}
      </div>`
}

function todaysMoveText(briefing: DailySandraBriefing): string {
  const working = briefing.working[0]
  const leaking = briefing.leaking[0]
  if (!working && !leaking) return ""
  return `\n\nToday's move\n${working || ""}${leaking ? `\nWatch: ${leaking}` : ""}`
}

function approvalActionsHtml(actions: ApprovalActionSummary[]): string {
  if (actions.length === 0) return ""
  return `
      <div style="background:#fff;border:2px solid #0D0E10;padding:22px;margin:0 0 14px;">
        <h2 style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 6px;">Waiting on you</h2>
        <p style="margin:0 0 16px;font-size:13px;color:#818283;line-height:1.6;">Nothing sends when you open a link. You see the final version and confirm once more.</p>
        ${actions
          .map(
            (action) => `
              <div style="border-top:1px solid rgba(197,198,200,.55);padding:14px 0;">
                <p style="margin:0 0 4px;font-size:15px;color:#0D0E10;"><strong>${escapeHtml(action.title)}</strong></p>
                <p style="margin:0 0 10px;font-size:13px;color:#4F5052;line-height:1.6;">${escapeHtml(action.summary)}</p>
                <a href="${action.approvalUrl}" style="display:inline-block;background:#0D0E10;color:#fff;text-decoration:none;padding:10px 14px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;">Review email</a>
                <span style="margin-left:8px;font-size:11px;color:#9A9A9A;">source: ${escapeHtml(action.source)}</span>
              </div>`,
          )
          .join("")}
      </div>`
}

function approvalActionsText(actions: ApprovalActionSummary[]): string {
  if (actions.length === 0) return ""
  return `\n\nWaiting on you\n${actions
    .map((action) => `- ${action.title}: ${action.summary}\n  Review: ${action.approvalUrl}`)
    .join("\n")}`
}

export function generateDailySandraBriefingEmail(briefing: DailySandraBriefing) {
  const html = `
<!doctype html>
<html>
  <body style="margin:0;background:#F8FAFA;color:#0D0E10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:680px;margin:0 auto;padding:34px 20px;">
      <p style="font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#818283;margin:0 0 20px;">SSELFIE Growth Intelligence</p>
      <h1 style="font-family:Georgia,serif;font-weight:400;font-size:34px;line-height:1.05;margin:0 0 10px;">Daily Sandra Briefing</h1>
      <p style="margin:0 0 28px;color:#4F5052;font-size:14px;line-height:1.6;">Last ${briefing.windowDays} days. Calm version. Only what matters today.</p>
      ${briefing.moneyHeader ? `
      <div style="background:#0D0E10;color:#fff;padding:18px 22px;margin:0 0 14px;">
        <p style="margin:0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55);">Money · stripe_payments</p>
        <p style="margin:6px 0 0;font-size:16px;line-height:1.5;">${escapeHtml(briefing.moneyHeader)}</p>
      </div>` : ""}
      ${approvalActionsHtml(briefing.approvalActions)}
      ${truthSnapshotHtml(briefing.truthSnapshot)}
      ${revenueScorecardHtml(briefing.revenueScorecard)}
      ${todaysMoveHtml(briefing)}
      ${briefing.supportThreads.length > 0 ? `
      <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 14px;">
        <h2 style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;">Customer threads</h2>
        ${supportThreadsHtml(briefing.supportThreads)}
      </div>` : ""}

      <p style="margin:0 0 12px;">
        <a href="${briefing.links.growthIntelligence}" style="display:inline-block;background:#0D0E10;color:#fff;text-decoration:none;padding:14px 18px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;">Open your admin</a>
      </p>
      <p style="margin:18px 0 0;color:#818283;font-size:12px;line-height:1.6;">
        Also useful: <a href="${briefing.links.customerSupport}" style="color:#4F5052;">customer support</a> · <a href="${briefing.links.promptVault}" style="color:#4F5052;">Prompt Vault monitor</a>
      </p>
    </div>
  </body>
</html>`

  const customerThreadsText = briefing.supportThreads.length > 0
    ? `\n\nCustomer threads\n${supportThreadsText(briefing.supportThreads)}`
    : ""

  const text = `Daily Sandra Briefing\nLast ${briefing.windowDays} days${briefing.moneyHeader ? `\n\n${briefing.moneyHeader}` : ""}${approvalActionsText(briefing.approvalActions)}${truthSnapshotText(briefing.truthSnapshot)}${revenueScorecardText(briefing.revenueScorecard)}${todaysMoveText(briefing)}${customerThreadsText}\n\nOpen Growth Intelligence: ${briefing.links.growthIntelligence}\nCustomer Support: ${briefing.links.customerSupport}`

  return {
    subject: briefing.subject,
    html,
    text,
  }
}
