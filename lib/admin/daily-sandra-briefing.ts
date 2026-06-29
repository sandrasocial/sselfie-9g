import type { GrowthTruthSnapshot } from "@/lib/admin/growth-truth"

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
  igCounts: {
    inboundMessages: number
    flagged: number
    agentDrafts: number
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
  topGrowthTags: ReportRow[]
  topPromptSignals: ReportRow[]
  freePromptSignals: ReportRow[]
  attributionRows: ReportRow[]
  truthSnapshot?: GrowthTruthSnapshot | null
}

export type DailyBriefingExtras = {
  money?: {
    yesterdayPayments: number
    yesterdayRevenue: number
    monthPayments: number
    monthRevenue: number
  }
  inboxFlagged?: Array<{ username: string; message: string }>
  inboxFlaggedCount?: number
}

export type DailySandraBriefing = {
  generatedAt: string
  windowDays: number
  subject: string
  moneyHeader: string | null
  truthSnapshot: GrowthTruthSnapshot | null
  inboxFlagged: Array<{ username: string; message: string }>
  inboxFlaggedCount: number
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
  links: {
    growthIntelligence: string
    promptVault: string
    inbox: string
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

function compactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "n/a"
  return value.toLocaleString("en-US")
}

function cleanLabel(value: unknown, fallback = "the strongest current visual angle"): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function humanTag(value: unknown): string {
  return cleanLabel(value, "AI photoshoot prompts").replace(/_/g, " ")
}

function contentInstructionForTag(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const tag = value.trim()
  switch (tag) {
    case "confused":
      return "Make the hook solve confusion: show the selfie, the finished image, and the exact first step in plain language."
    case "price_objection":
      return "Make the hook prove value: show that one selfie can become a full shoot, not just one image."
    case "how_to_use_chatgpt":
      return "Make the hook beginner-friendly: show exactly where to paste the prompt and what to upload."
    case "vault_interest":
      return "Make the hook lead naturally into the Vault: one opening shot is free, the full shoot is inside."
    case "prompt_request":
      return "Use PROMPT as the comment or DM keyword and make the first visual result impossible to miss."
    case "buyer_intent":
      return "Use a direct story CTA today. The audience is already showing buying intent."
    default:
      return `Use the audience language "${humanTag(tag)}" in the hook, caption, or ManyChat reply.`
  }
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
  const topGrowthTag = report.topGrowthTags[0]
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

  if (report.igCounts.inboundMessages <= 1) {
    leaking.push("IG audience intelligence is still thin. Real DMs/comments should improve once Meta permissions and traffic are flowing.")
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

  const tagInstruction = contentInstructionForTag(topGrowthTag?.tag)
  if (tagInstruction) {
    postToday.push(tagInstruction)
  } else {
    postToday.push("Ask for replies: Which visual world should I build next? Use the answers as the next drop signal.")
  }

  postToday.push("Send story traffic directly to the free preview or Vault with clean UTM tracking.")

  sandraNext.push("Choose today's reel angle from the strongest visual signal above.")
  sandraNext.push("Review /my-inbox and Customer Support for emotional wording, objections, bugs, and aesthetic requests.")
  sandraNext.push("Keep posting transformation proof before teaching the prompt mechanics.")

  if ((report.supportCounts?.new || 0) > 0 || (report.supportCounts?.reviewing || 0) > 0) {
    codexNext.push("Triage open customer support threads and fix any product bugs before optimizing more funnel copy.")
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
  } else if (report.igCounts.inboundMessages <= 1) {
    codexNext.push("Keep IG agent in draft-only mode and verify real comment/DM events as Meta permissions land.")
  } else {
    codexNext.push("No urgent code fix. Monitor attribution, prompt copies, and IG tags before building another product layer.")
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
    inboxFlagged: (extras.inboxFlagged || []).slice(0, 5),
    inboxFlaggedCount: extras.inboxFlaggedCount ?? (extras.inboxFlagged || []).length,
    working: working.slice(0, 4),
    leaking: leaking.slice(0, 4),
    postToday: postToday.slice(0, 3),
    codexNext: codexNext.slice(0, 3),
    sandraNext: sandraNext.slice(0, 3),
    supportThreads,
    links: {
      growthIntelligence: `${SITE_URL}/admin`,
      promptVault: `${SITE_URL}/admin/prompt-vault`,
      inbox: `${SITE_URL}/admin/ig-inbox`,
      customerSupport: `${SITE_URL}/admin/customer-support`,
    },
  }
}

function listHtml(items: string[]): string {
  return items.map((item) => `<li style="margin:0 0 10px;line-height:1.6;">${escapeHtml(item)}</li>`).join("")
}

function listText(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n")
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
      ${briefing.inboxFlaggedCount > 0 ? `
      <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 14px;">
        <h2 style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;">Inbox: ${briefing.inboxFlaggedCount} flagged DM${briefing.inboxFlaggedCount === 1 ? "" : "s"}</h2>
        ${briefing.inboxFlagged.map((item) => `<p style="margin:0 0 10px;font-size:14px;color:#4F5052;line-height:1.6;"><strong style="color:#0D0E10;">@${escapeHtml(item.username)}</strong> · ${escapeHtml(item.message)}</p>`).join("")}
        <a href="${briefing.links.inbox}" style="color:#0D0E10;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">Open inbox</a>
      </div>` : ""}
      ${truthSnapshotHtml(briefing.truthSnapshot)}

      <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 14px;">
        <h2 style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;">What's working</h2>
        <ul style="padding-left:18px;margin:0;color:#4F5052;">${listHtml(briefing.working)}</ul>
      </div>

      <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 14px;">
        <h2 style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;">What's leaking</h2>
        <ul style="padding-left:18px;margin:0;color:#4F5052;">${listHtml(briefing.leaking)}</ul>
      </div>

      <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 14px;">
        <h2 style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;">Customer threads</h2>
        ${supportThreadsHtml(briefing.supportThreads)}
      </div>

      <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 14px;">
        <h2 style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;">What to post today</h2>
        <ul style="padding-left:18px;margin:0;color:#4F5052;">${listHtml(briefing.postToday)}</ul>
      </div>

      <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 14px;">
        <h2 style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;">What Codex should fix next</h2>
        <ul style="padding-left:18px;margin:0;color:#4F5052;">${listHtml(briefing.codexNext)}</ul>
      </div>

      <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 24px;">
        <h2 style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;">What Sandra does</h2>
        <ul style="padding-left:18px;margin:0;color:#4F5052;">${listHtml(briefing.sandraNext)}</ul>
      </div>

      <p style="margin:0 0 12px;">
        <a href="${briefing.links.growthIntelligence}" style="display:inline-block;background:#0D0E10;color:#fff;text-decoration:none;padding:14px 18px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;">Open your admin</a>
      </p>
      <p style="margin:18px 0 0;color:#818283;font-size:12px;line-height:1.6;">
        Also useful: <a href="${briefing.links.inbox}" style="color:#4F5052;">my inbox</a> · <a href="${briefing.links.customerSupport}" style="color:#4F5052;">customer support</a> · <a href="${briefing.links.promptVault}" style="color:#4F5052;">Prompt Vault monitor</a>
      </p>
    </div>
  </body>
</html>`

  const inboxTextSection = briefing.inboxFlaggedCount > 0
    ? `\n\nInbox: ${briefing.inboxFlaggedCount} flagged\n${briefing.inboxFlagged.map((item) => `- @${item.username}: ${item.message}`).join("\n")}`
    : ""

  const text = `Daily Sandra Briefing\nLast ${briefing.windowDays} days${briefing.moneyHeader ? `\n\n${briefing.moneyHeader}` : ""}${inboxTextSection}${truthSnapshotText(briefing.truthSnapshot)}\n\nWhat's working\n${listText(briefing.working)}\n\nWhat's leaking\n${listText(briefing.leaking)}\n\nCustomer threads\n${supportThreadsText(briefing.supportThreads)}\n\nWhat to post today\n${listText(briefing.postToday)}\n\nWhat Codex should fix next\n${listText(briefing.codexNext)}\n\nWhat Sandra does\n${listText(briefing.sandraNext)}\n\nOpen Growth Intelligence: ${briefing.links.growthIntelligence}\nCustomer Support: ${briefing.links.customerSupport}\nMy Inbox: ${briefing.links.inbox}`

  return {
    subject: briefing.subject,
    html,
    text,
  }
}
