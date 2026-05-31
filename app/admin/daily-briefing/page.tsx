import Link from "next/link"
import type { ReactNode } from "react"
import {
  Archive,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Eye,
  MessageCircle,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react"
import { AdminNav } from "@/components/admin/admin-nav"
import { CodexTaskMemoryBoard } from "@/components/admin/codex-task-memory-board"
import { MorningBoardVisualPlanner } from "@/components/admin/morning-board-visual-planner"
import { getCodexTaskMemory } from "@/lib/admin/codex-task-memory"
import { getContentBoardData } from "@/lib/admin/content-planner"
import { buildDailySandraBriefing } from "@/lib/admin/daily-sandra-briefing"
import {
  formatMoney,
  formatPercent,
  getGrowthIntelligenceReport,
} from "@/lib/admin/growth-intelligence"

export const dynamic = "force-dynamic"

type PromptSignalRow = {
  prompt_title: string | null
  prompt_number: string | null
  mood?: string | null
  views?: number
  copies: number
  score?: number
}

type GrowthTagRow = {
  tag: string
  count: number
}

type AttributionRow = {
  source: string | null
  utm_source: string | null
  utm_campaign: string | null
  utm_content: string | null
  entry_post_slug: string | null
  cta_keyword: string | null
  checkout_starts: number
  purchases: number
  recovery_sends: number
  recoverable_starts: number
  unrecoverable_starts: number
}

type RecentIgSignalRow = {
  id: number
  channel: string
  status: string
  username: string
  latest_message: string | null
  growth_tags: string[] | null
}

type SupportThreadRow = {
  id: string
  customer: string
  email: string
  label: string
  subject: string
  message: string
  status: string
  action: string
}

function safeText(value: unknown, fallback = "Not enough signal yet") {
  return typeof value === "string" && value.trim() ? value : fallback
}

function humanTag(value: string) {
  return value.replace(/_/g, " ")
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function firstSentence(items: string[], fallback: string) {
  return items[0] || fallback
}

function boardCardClass(extra = "") {
  return `border border-[rgba(197,198,200,.38)] bg-white ${extra}`
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ss-gray)]">
      {children}
    </p>
  )
}

function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <Label>{eyebrow}</Label>}
        <h2 className="mt-2 font-['Times_New_Roman'] text-2xl font-light uppercase tracking-[0.18em] text-[color:var(--ss-night)] sm:text-3xl">
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

function ActionWidget({
  label,
  title,
  body,
  meta,
  href,
  linkLabel,
  icon,
}: {
  label: string
  title: string
  body: string
  meta?: string
  href?: string
  linkLabel?: string
  icon: ReactNode
}) {
  return (
    <article className={boardCardClass("flex min-h-[260px] flex-col justify-between p-5 sm:p-6")}>
      <div>
        <div className="mb-5 flex items-center justify-between gap-4">
          <Label>{label}</Label>
          <div className="text-[color:var(--ss-gray)]">{icon}</div>
        </div>
        <h3 className="max-w-[18rem] text-lg font-medium leading-snug text-[color:var(--ss-night)]">
          {title}
        </h3>
        <p className="mt-4 text-sm leading-7 text-[color:var(--ss-davy)]">{body}</p>
      </div>
      <div className="mt-6">
        {meta && <p className="mb-4 text-xs leading-6 text-[color:var(--ss-gray)]">{meta}</p>}
        {href && linkLabel && (
          <Link
            href={href}
            className="inline-flex min-h-[44px] items-center gap-2 border border-[color:var(--ss-night)] bg-[color:var(--ss-night)] px-4 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ss-seasalt)] transition-transform active:translate-y-px"
          >
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </article>
  )
}

function SignalCard({
  label,
  title,
  body,
  support,
}: {
  label: string
  title: string
  body: string
  support?: string
}) {
  return (
    <article className={boardCardClass("p-5")}>
      <Label>{label}</Label>
      <h3 className="mt-4 text-base font-medium text-[color:var(--ss-night)]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[color:var(--ss-davy)]">{body}</p>
      {support && (
        <p className="mt-5 border-t border-[rgba(197,198,200,.35)] pt-4 text-xs text-[color:var(--ss-gray)]">
          {support}
        </p>
      )}
    </article>
  )
}

function ChecklistCard({
  title,
  items,
  icon,
}: {
  title: string
  items: string[]
  icon: ReactNode
}) {
  return (
    <article className={boardCardClass("p-5 sm:p-6")}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-[color:var(--ss-night)]">
          {title}
        </h3>
        <div className="text-[color:var(--ss-gray)]">{icon}</div>
      </div>
      <div className="space-y-4">
        {items.slice(0, 3).map((item, index) => (
          <div key={`${title}-${item}`} className="grid grid-cols-[34px_1fr] gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-[rgba(197,198,200,.45)] text-[10px] uppercase tracking-[0.12em] text-[color:var(--ss-gray)]">
              {String(index + 1).padStart(2, "0")}
            </div>
            <p className="pt-1 text-sm leading-7 text-[color:var(--ss-davy)]">{item}</p>
          </div>
        ))}
      </div>
    </article>
  )
}

function MiniMetric({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="border-t border-[rgba(197,198,200,.35)] py-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-gray)]">{label}</p>
      <p className="mt-2 font-['Times_New_Roman'] text-3xl text-[color:var(--ss-night)]">{value}</p>
      {helper && <p className="mt-1 text-xs text-[color:var(--ss-gray)]">{helper}</p>}
    </div>
  )
}

export default async function DailyBriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const params = await searchParams
  const requestedDays = Number(params.days || 7)
  const windowDays = [1, 3, 7, 14, 30].includes(requestedDays) ? requestedDays : 7
  const [report, contentBoard] = await Promise.all([
    getGrowthIntelligenceReport(windowDays),
    getContentBoardData(),
  ])
  const briefing = buildDailySandraBriefing(report)
  const codexTasks = await getCodexTaskMemory(report)

  const topPromptSignals = report.topPromptSignals as PromptSignalRow[]
  const freePromptSignals = report.freePromptSignals as PromptSignalRow[]
  const topGrowthTags = report.topGrowthTags as GrowthTagRow[]
  const attributionRows = report.attributionRows as AttributionRow[]
  const recentIgSignals = report.recentIgSignals as RecentIgSignalRow[]
  const supportThreads = briefing.supportThreads as SupportThreadRow[]

  const purchases = report.paymentCounts.purchases || report.eventCounts.checkoutSuccesses
  const buyers = report.buyerCounts.buyers || report.paymentCounts.purchases
  const topPaidPrompt = topPromptSignals[0]
  const topFreePrompt = freePromptSignals[0]
  const strongestVisual = safeText(
    topPaidPrompt?.prompt_title || topFreePrompt?.prompt_title,
    "the strongest current transformation"
  )
  const topTag = topGrowthTags[0]?.tag
    ? humanTag(topGrowthTags[0].tag)
    : "new visual identity requests"
  const offerBridge =
    report.eventCounts.aiPromptAccessOpens > 0 &&
    formatPercent(report.eventCounts.freeToVaultClicks, report.eventCounts.aiPromptAccessOpens) !==
      "0%"
      ? "Free preview to Vault"
      : "Free preview to Vault"

  const focusSummary = firstSentence(
    briefing.working,
    "The tracking layer is ready. Today is about creating one clean traffic moment and watching the bridge."
  )

  const postBody = briefing.postToday.join(" ")
  const offerBody =
    "Send warm traffic to the updated free preview first, then make the upgrade feel like the natural next step: the full shoot, all new drops, and future photoshoots inside the Vault."
  const codexBody = firstSentence(
    briefing.codexNext,
    "Keep the tracking layer stable and compare tomorrow's same four signals before adding more product complexity."
  )

  return (
    <div className="min-h-screen bg-[color:var(--ss-seasalt)] text-[color:var(--ss-night)]">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Label>SSELFIE Internal Studio</Label>
            <h1 className="mt-3 font-['Times_New_Roman'] text-4xl font-light uppercase leading-none tracking-[0.16em] text-[color:var(--ss-night)] sm:text-5xl">
              Sandra&apos;s Morning Board
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ss-davy)]">
              Today&apos;s clearest signal, content direction, and next fix.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 3, 7, 14, 30].map(days => (
              <Link
                key={days}
                href={`/admin/daily-briefing?days=${days}`}
                className={`min-h-[44px] border px-4 py-3 text-[10px] font-medium uppercase tracking-[0.18em] transition-colors ${
                  days === windowDays
                    ? "border-[color:var(--ss-night)] bg-[color:var(--ss-night)] text-[color:var(--ss-seasalt)]"
                    : "border-[rgba(197,198,200,.75)] bg-white text-[color:var(--ss-davy)] hover:border-[color:var(--ss-night)]"
                }`}
              >
                {days}D
              </Link>
            ))}
          </div>
        </div>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.55fr_.85fr]">
          <article className="border border-[rgba(197,198,200,.38)] bg-white p-6 sm:p-8 lg:p-10">
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Label>{formatDate(briefing.generatedAt)}</Label>
                <h2 className="mt-5 max-w-3xl font-['Times_New_Roman'] text-3xl font-light leading-tight text-[color:var(--ss-night)] sm:text-5xl">
                  Today&apos;s Focus
                </h2>
              </div>
              <Link
                href={`/admin/daily-briefing?days=${windowDays}`}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-[rgba(197,198,200,.65)] bg-[color:var(--ss-seasalt)] px-4 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ss-raisin)] transition-colors hover:border-[color:var(--ss-night)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Pull Latest
              </Link>
            </div>
            <p className="max-w-4xl text-xl leading-9 text-[color:var(--ss-raisin)]">
              {focusSummary}
            </p>
            <div className="mt-8 border-t border-[rgba(197,198,200,.35)] pt-6">
              <Label>Primary action</Label>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--ss-davy)]">
                Post one transformation-led reel around {strongestVisual}. Show the finished image
                first, then bridge to the updated free preview and Vault.
              </p>
            </div>
          </article>

          <aside className="border border-[color:var(--ss-night)] bg-[color:var(--ss-night)] p-6 text-[color:var(--ss-seasalt)] sm:p-8">
            <Label>Do not overthink this</Label>
            <p className="mt-5 font-['Times_New_Roman'] text-3xl font-light leading-tight">
              One reel. One bridge. One fix.
            </p>
            <p className="mt-5 text-sm leading-7 text-[color:var(--ss-silver)]">
              Keep the offer path clean today. The point is not more ideas; it is one visible
              transformation, one useful preview, and one measured upgrade moment.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-silver)]">
                  Vault visits
                </p>
                <p className="mt-2 font-['Times_New_Roman'] text-3xl">
                  {report.eventCounts.vaultVisits}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-silver)]">
                  Sales
                </p>
                <p className="mt-2 font-['Times_New_Roman'] text-3xl">{purchases}</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mb-10 grid gap-4 lg:grid-cols-[1.1fr_.95fr_1fr]">
          <ActionWidget
            label="Post Today"
            title={`Prompt My Selfie: ${strongestVisual}`}
            body={postBody}
            meta={`Buyer language to listen for: ${topTag}.`}
            href="/admin/ig-inbox"
            linkLabel="Open Inbox"
            icon={<Sparkles className="h-5 w-5" />}
          />
          <ActionWidget
            label="Offer Bridge"
            title={offerBridge}
            body={offerBody}
            meta="Primary path: free preview first. Secondary path: full Vault for the remaining shots and future drops."
            href="/prompt-vault?source=morning_board&utm_source=admin&utm_medium=morning_board&utm_campaign=prompt_vault_bridge"
            linkLabel="Check Bridge"
            icon={<MousePointerClick className="h-5 w-5" />}
          />
          <ActionWidget
            label="Codex Fix Next"
            title="Fix the most visible leak before building more."
            body={codexBody}
            meta="Owner: Codex. Keep this as a small, measurable task."
            href="/admin/growth-intelligence"
            linkLabel="Open Data"
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        </section>

        <section className="mb-10 grid gap-4 lg:grid-cols-2">
          <ChecklistCard
            title="Sandra Does Today"
            items={briefing.sandraNext}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <ChecklistCard
            title="Claude/Codex Does Today"
            items={briefing.codexNext}
            icon={<ClipboardList className="h-5 w-5" />}
          />
        </section>

        <CodexTaskMemoryBoard initialTasks={codexTasks} windowDays={windowDays} />

        <section className="mb-10">
          <SectionTitle eyebrow="Customer service" title="Support Threads">
            <Link
              href="/admin/customer-support"
              className="inline-flex min-h-[44px] items-center gap-2 border border-[rgba(197,198,200,.65)] bg-white px-4 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ss-davy)] hover:border-[color:var(--ss-night)]"
            >
              Open Support
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </SectionTitle>

          {supportThreads.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {supportThreads.slice(0, 4).map(thread => (
                <article key={thread.id} className={boardCardClass("p-5 sm:p-6")}>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <Label>
                        {thread.label} · {thread.status}
                      </Label>
                      <h3 className="mt-3 text-base font-medium leading-snug text-[color:var(--ss-night)]">
                        {thread.subject}
                      </h3>
                    </div>
                    <Wrench className="h-5 w-5 shrink-0 text-[color:var(--ss-gray)]" />
                  </div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--ss-gray)]">
                    {thread.customer} · {thread.email}
                  </p>
                  <p className="mt-4 line-clamp-3 text-sm leading-7 text-[color:var(--ss-davy)]">
                    {thread.message}
                  </p>
                  <p className="mt-4 border-t border-[rgba(197,198,200,.35)] pt-4 text-xs leading-6 text-[color:var(--ss-gray)]">
                    {thread.action}
                  </p>
                  <Link
                    href={`/admin/customer-support?q=${encodeURIComponent(thread.email)}`}
                    className="mt-5 inline-flex min-h-[44px] items-center gap-2 border border-[color:var(--ss-night)] bg-[color:var(--ss-night)] px-4 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ss-seasalt)]"
                  >
                    Open Thread
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <article className={boardCardClass("p-5 sm:p-6")}>
              <p className="text-sm leading-7 text-[color:var(--ss-davy)]">
                No fresh customer support threads in this window. Feedback still flows through
                the in-app feedback form and lands in Customer Support when someone submits a bug
                or question.
              </p>
            </article>
          )}
        </section>

        <section className="mb-10">
          <SectionTitle eyebrow="Plain language" title="What's Working" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {briefing.working.map((item, index) => (
              <SignalCard
                key={`working-${item}`}
                label={`Working 0${index + 1}`}
                title={
                  index === 0
                    ? "Audience signal is moving"
                    : index === 1
                      ? "Vault traffic has intent"
                      : index === 2
                        ? "Revenue is tracked"
                        : "Product use matters"
                }
                body={item}
                support={
                  index === 0
                    ? `${report.eventCounts.aiPromptOptins} opt-ins · ${report.eventCounts.freePromptCopies} free prompt copies`
                    : undefined
                }
              />
            ))}
          </div>
        </section>

        <section className="mb-10">
          <SectionTitle eyebrow="Needs attention" title="What's Leaking" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {briefing.leaking.map((item, index) => (
              <SignalCard
                key={`leaking-${item}`}
                label={index === 0 ? "Fix next" : "Watch tomorrow"}
                title={
                  index === 0
                    ? "Bridge needs clarity"
                    : index === 1
                      ? "Activation may leak"
                      : index === 2
                        ? "Audience data is thin"
                        : "Keep watching"
                }
                body={item}
              />
            ))}
          </div>
        </section>

        <MorningBoardVisualPlanner
          initialPosts={contentBoard.recentPosts}
          initialSlots={contentBoard.plannerSlots}
          instagramSource={contentBoard.instagramSource}
          instagramInsightStatus={contentBoard.instagramInsightStatus}
          plannerSource={contentBoard.plannerSource}
        />

        <section className="mb-10 grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
          <div className={boardCardClass("p-5 sm:p-6")}>
            <SectionTitle eyebrow="Next planning layer" title="Content Calendar" />
            <div className="space-y-3">
              {briefing.postToday.map((item, index) => (
                <div
                  key={`calendar-${item}`}
                  className="grid grid-cols-[40px_1fr] gap-3 border-t border-[rgba(197,198,200,.35)] pt-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center border border-[rgba(197,198,200,.45)]">
                    <CalendarDays className="h-4 w-4 text-[color:var(--ss-gray)]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-gray)]">
                      Planned idea 0{index + 1}
                    </p>
                    <p className="mt-1 text-sm leading-7 text-[color:var(--ss-davy)]">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={boardCardClass("p-5 sm:p-6")}>
            <SectionTitle eyebrow="Buyer language" title="Recent Signals" />
            {recentIgSignals.length > 0 ? (
              <div className="divide-y divide-[rgba(197,198,200,.35)]">
                {recentIgSignals.slice(0, 4).map(signal => (
                  <div key={signal.id} className="py-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm text-[color:var(--ss-night)]">@{signal.username}</p>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--ss-gray)]">
                        {signal.channel} · {signal.status}
                      </p>
                    </div>
                    <p className="line-clamp-2 text-sm leading-7 text-[color:var(--ss-davy)]">
                      {signal.latest_message || "No message preview"}
                    </p>
                    {(signal.growth_tags || []).length > 0 && (
                      <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[color:var(--ss-gray)]">
                        {(signal.growth_tags || []).map(humanTag).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-[color:var(--ss-davy)]">
                No real IG signal volume in this window yet. Once Graph permissions and real
                comments/DMs flow, this becomes the place to mine hooks, objections, and next-shoot
                demand.
              </p>
            )}
          </div>
        </section>

        <details className={boardCardClass("group p-5 sm:p-6")}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div>
              <Label>Raw metrics</Label>
              <h2 className="mt-2 font-['Times_New_Roman'] text-2xl font-light uppercase tracking-[0.18em] text-[color:var(--ss-night)]">
                Data Room
              </h2>
            </div>
            <span className="inline-flex min-h-[44px] items-center gap-2 border border-[rgba(197,198,200,.55)] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-davy)]">
              View Raw Signals
              <Archive className="h-3.5 w-3.5" />
            </span>
          </summary>

          <div className="mt-8 grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <MiniMetric
                label="AI prompt opt-ins"
                value={report.eventCounts.aiPromptOptins}
                helper={`${report.eventCounts.aiPromptAccessOpens} access opens`}
              />
              <MiniMetric
                label="Free to Vault clicks"
                value={report.eventCounts.freeToVaultClicks}
                helper={`${formatPercent(report.eventCounts.freeToVaultClicks, report.eventCounts.aiPromptAccessOpens)} from free access`}
              />
              <MiniMetric
                label="Checkout starts"
                value={report.eventCounts.checkoutStarts}
                helper={`${formatPercent(report.eventCounts.checkoutStarts, report.eventCounts.vaultVisits)} from Vault visits`}
              />
              <MiniMetric
                label="Unrecoverable starts"
                value={report.eventCounts.checkoutUnrecoverableStarts}
                helper={`${formatPercent(report.eventCounts.checkoutUnrecoverableStarts, report.eventCounts.checkoutStarts)} missing email · ${report.eventCounts.manychatUnrecoverableStarts} from ManyChat`}
              />
              <MiniMetric
                label="Revenue"
                value={formatMoney(report.paymentCounts.revenueCents)}
                helper={`${buyers} buyer records · ${report.eventCounts.vaultAccessOpeners} access openers`}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-gray)]">
                  <tr className="border-b border-[rgba(197,198,200,.45)]">
                    <th className="py-3 pr-4 font-medium">Source</th>
                    <th className="py-3 pr-4 font-medium">Campaign</th>
                    <th className="py-3 pr-4 font-medium">Content</th>
                    <th className="py-3 pr-4 font-medium">Keyword</th>
                    <th className="py-3 pr-4 text-right font-medium">Starts</th>
                    <th className="py-3 pr-4 text-right font-medium">Sales</th>
                    <th className="py-3 text-right font-medium">Recovery</th>
                    <th className="py-3 text-right font-medium">No Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(197,198,200,.35)]">
                  {attributionRows.length > 0 ? (
                    attributionRows.map(row => (
                      <tr
                        key={`${row.source}-${row.utm_campaign}-${row.utm_content}-${row.entry_post_slug}-${row.cta_keyword}`}
                      >
                        <td className="py-3 pr-4 text-[color:var(--ss-night)]">
                          {row.source || row.utm_source || "direct"}
                        </td>
                        <td className="py-3 pr-4 text-[color:var(--ss-davy)]">
                          {row.utm_campaign || "-"}
                        </td>
                        <td className="py-3 pr-4 text-[color:var(--ss-davy)]">
                          {row.utm_content || row.entry_post_slug || "-"}
                        </td>
                        <td className="py-3 pr-4 text-[color:var(--ss-davy)]">
                          {row.cta_keyword || "-"}
                        </td>
                        <td className="py-3 pr-4 text-right text-[color:var(--ss-night)]">
                          {row.checkout_starts}
                        </td>
                        <td className="py-3 pr-4 text-right text-[color:var(--ss-night)]">
                          {row.purchases}
                        </td>
                        <td className="py-3 text-right text-[color:var(--ss-night)]">
                          {row.recovery_sends}
                        </td>
                        <td className="py-3 text-right text-[color:var(--ss-night)]">
                          {row.unrecoverable_starts || 0}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-5 text-[color:var(--ss-davy)]">
                        No Prompt Vault checkout attribution rows in this window yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/admin/growth-intelligence"
              className="inline-flex min-h-[44px] items-center gap-2 border border-[color:var(--ss-night)] bg-[color:var(--ss-night)] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-seasalt)]"
            >
              Open Growth Intelligence Details
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/admin/prompt-vault"
              className="inline-flex min-h-[44px] items-center gap-2 border border-[rgba(197,198,200,.65)] bg-white px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-davy)]"
            >
              Prompt Vault Monitor
              <Eye className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/my-inbox"
              className="inline-flex min-h-[44px] items-center gap-2 border border-[rgba(197,198,200,.65)] bg-white px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-davy)]"
            >
              My Inbox
              <MessageCircle className="h-3.5 w-3.5" />
            </Link>
          </div>
        </details>
      </main>
    </div>
  )
}
