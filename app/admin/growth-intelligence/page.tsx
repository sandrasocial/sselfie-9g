import Link from "next/link"
import {
  BarChart3,
  Brain,
  Copy,
  DollarSign,
  Eye,
  MessageCircle,
  MousePointerClick,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
  AlertTriangle,
} from "lucide-react"
import { AdminNav } from "@/components/admin/admin-nav"
import { AdminMetricCard } from "@/components/admin/shared"
import {
  formatMoney,
  formatPercent,
  getGrowthIntelligenceReport,
  type GrowthPriority,
} from "@/lib/admin/growth-intelligence"

export const dynamic = "force-dynamic"

function priorityClasses(status: GrowthPriority["status"]) {
  if (status === "urgent") return "border-red-200 bg-red-50 text-red-950"
  if (status === "watch") return "border-amber-200 bg-amber-50 text-amber-950"
  return "border-stone-200 bg-white text-stone-950"
}

function priorityLabel(status: GrowthPriority["status"]) {
  if (status === "urgent") return "Fix first"
  if (status === "watch") return "Watch"
  return "Working"
}

function safeText(value: unknown, fallback = "-") {
  return typeof value === "string" && value.trim() ? value : fallback
}

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
  utm_medium: string | null
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

export default async function GrowthIntelligencePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const params = await searchParams
  const requestedDays = Number(params.days || 7)
  const windowDays = [1, 3, 7, 14, 30].includes(requestedDays) ? requestedDays : 7
  const report = await getGrowthIntelligenceReport(windowDays)
  const { eventCounts, paymentCounts, buyerCounts, igCounts } = report
  const topPromptSignals = report.topPromptSignals as PromptSignalRow[]
  const freePromptSignals = report.freePromptSignals as PromptSignalRow[]
  const topGrowthTags = report.topGrowthTags as GrowthTagRow[]
  const attributionRows = report.attributionRows as AttributionRow[]
  const recentIgSignals = report.recentIgSignals as RecentIgSignalRow[]

  const purchases = paymentCounts.purchases || eventCounts.checkoutSuccesses
  const buyers = buyerCounts.buyers || paymentCounts.purchases
  const vaultAccessOpeners = eventCounts.vaultAccessOpeners || 0

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-stone-400">
              Daily Decision System
            </p>
            <h1 className="mb-3 font-['Times_New_Roman'] text-3xl font-extralight uppercase tracking-[0.2em] text-stone-950 sm:text-4xl sm:tracking-[0.3em] lg:text-5xl">
              GROWTH INTELLIGENCE
            </h1>
            <p className="max-w-2xl text-xs uppercase tracking-[0.1em] text-stone-500 sm:text-sm">
              What people want, where the funnel leaks, and what Sandra should focus on next.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 3, 7, 14, 30].map((days) => (
              <Link
                key={days}
                href={`/admin/growth-intelligence?days=${days}`}
                className={`border px-4 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                  days === windowDays
                    ? "border-stone-950 bg-stone-950 text-stone-50"
                    : "border-stone-300 bg-white text-stone-700 hover:border-stone-950"
                }`}
              >
                {days}D
              </Link>
            ))}
          </div>
        </div>

        <section className="mb-8 border border-stone-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <Brain className="h-5 w-5 text-stone-600" />
            <div>
              <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.2em] text-stone-950 sm:text-2xl">
                TODAY&apos;S PRIORITIES
              </h2>
              <p className="text-xs text-stone-500">
                Generated {new Date(report.generatedAt).toLocaleString()} from the last {windowDays} day{windowDays === 1 ? "" : "s"}.
              </p>
            </div>
          </div>

          {report.priorities.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {report.priorities.map((priority) => (
                <article key={`${priority.label}-${priority.status}`} className={`border p-4 ${priorityClasses(priority.status)}`}>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] opacity-70">
                    {priorityLabel(priority.status)}
                  </p>
                  <h3 className="mb-2 text-sm font-medium uppercase tracking-[0.12em]">
                    {priority.label}
                  </h3>
                  <p className="text-sm leading-relaxed opacity-80">{priority.message}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-stone-500">
              No priority signal yet. Keep driving tagged traffic into the AI prompt funnel.
            </p>
          )}
        </section>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <AdminMetricCard
            label="AI Prompt Opt-ins"
            value={eventCounts.aiPromptOptins}
            icon={<Users className="h-5 w-5" />}
            subtitle={`${eventCounts.aiPromptAccessOpens} access opens`}
          />
          <AdminMetricCard
            label="Free Prompt Copies"
            value={eventCounts.freePromptCopies}
            icon={<Copy className="h-5 w-5" />}
            subtitle="Free demand signal"
          />
          <AdminMetricCard
            label="Free → Vault"
            value={eventCounts.freeToVaultClicks}
            icon={<MousePointerClick className="h-5 w-5" />}
            subtitle={`${formatPercent(eventCounts.freeToVaultClicks, eventCounts.aiPromptAccessOpens)} from free access`}
          />
          <AdminMetricCard
            label="Vault Visits"
            value={eventCounts.vaultVisits}
            icon={<BarChart3 className="h-5 w-5" />}
            subtitle="Paid offer traffic"
          />
          <AdminMetricCard
            label="Checkout Starts"
            value={eventCounts.checkoutStarts}
            icon={<ShoppingCart className="h-5 w-5" />}
            subtitle={`${formatPercent(eventCounts.checkoutStarts, eventCounts.vaultVisits)} from Vault visits`}
          />
          <AdminMetricCard
            label="Unrecoverable Starts"
            value={eventCounts.checkoutUnrecoverableStarts}
            icon={<AlertTriangle className="h-5 w-5" />}
            subtitle={`${formatPercent(eventCounts.checkoutUnrecoverableStarts, eventCounts.checkoutStarts)} missing email · ${eventCounts.manychatUnrecoverableStarts} ManyChat`}
          />
          <AdminMetricCard
            label="Purchases"
            value={purchases}
            icon={<DollarSign className="h-5 w-5" />}
            subtitle={`${formatPercent(purchases, eventCounts.checkoutStarts)} checkout conversion`}
          />
          <AdminMetricCard
            label="Vault Revenue"
            value={formatMoney(paymentCounts.revenueCents)}
            icon={<DollarSign className="h-5 w-5" />}
            subtitle="Stripe payments"
          />
          <AdminMetricCard
            label="Vault Access Opens"
            value={vaultAccessOpeners}
            icon={<Eye className="h-5 w-5" />}
            subtitle={`${formatPercent(vaultAccessOpeners, buyers)} of buyers · ${eventCounts.vaultAccessOpens} total opens`}
          />
          <AdminMetricCard
            label="Vault Prompt Copies"
            value={eventCounts.vaultPromptCopies}
            icon={<Copy className="h-5 w-5" />}
            subtitle={`${buyers ? (eventCounts.vaultPromptCopies / buyers).toFixed(1) : "0"} per buyer`}
          />
          <AdminMetricCard
            label="IG Signals"
            value={igCounts.inboundMessages}
            icon={<MessageCircle className="h-5 w-5" />}
            subtitle={`${igCounts.flagged} flagged · ${igCounts.agentDrafts} drafts`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="border border-stone-200 bg-white p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.2em] text-stone-950 sm:text-2xl">
                TOP AESTHETIC SIGNALS
              </h2>
              <Sparkles className="h-5 w-5 text-stone-400" />
            </div>
            {topPromptSignals.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {topPromptSignals.map((prompt) => (
                  <div key={`${prompt.prompt_number}-${prompt.prompt_title}-${prompt.mood}`} className="flex items-start justify-between gap-4 py-4">
                    <div>
                      <p className="text-sm text-stone-950">
                        {prompt.prompt_number ? `${prompt.prompt_number}. ` : ""}
                        {safeText(prompt.prompt_title, "Untitled prompt")}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-stone-400">
                        {safeText(prompt.mood, "No mood label")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-['Times_New_Roman'] text-2xl text-stone-950">{prompt.score || 0}</p>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-stone-400">
                        {prompt.views || 0} views · {prompt.copies} copies
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-stone-500">
                No paid Vault prompt view/copy signal yet. This fills once buyers use the Vault.
              </p>
            )}
          </section>

          <section className="border border-stone-200 bg-white p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.2em] text-stone-950 sm:text-2xl">
                IG DEMAND LANGUAGE
              </h2>
              <MessageCircle className="h-5 w-5 text-stone-400" />
            </div>
            {topGrowthTags.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {topGrowthTags.map((row) => (
                  <div key={row.tag} className="border border-stone-100 bg-stone-50 p-4">
                    <p className="text-sm text-stone-950">{String(row.tag).replace(/_/g, " ")}</p>
                    <p className="mt-2 font-['Times_New_Roman'] text-3xl text-stone-950">{row.count}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-stone-500">
                No IG growth tags in this window yet. DMs and comments will populate this after Meta events flow.
              </p>
            )}
          </section>

          <section className="border border-stone-200 bg-white p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.2em] text-stone-950 sm:text-2xl">
                SOURCE → CHECKOUT ATTRIBUTION
              </h2>
              <TrendingUp className="h-5 w-5 text-stone-400" />
            </div>
            {attributionRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                    <tr className="border-b border-stone-100">
                      <th className="py-3 pr-4 font-medium">Source</th>
                      <th className="py-3 pr-4 font-medium">Campaign</th>
                      <th className="py-3 pr-4 font-medium">Content</th>
                      <th className="py-3 pr-4 font-medium">Reel</th>
                      <th className="py-3 pr-4 font-medium">Keyword</th>
                      <th className="py-3 pr-4 text-right font-medium">Starts</th>
                      <th className="py-3 pr-4 text-right font-medium">Sales</th>
                      <th className="py-3 text-right font-medium">Recovery</th>
                      <th className="py-3 text-right font-medium">No Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {attributionRows.map((row) => (
                      <tr key={`${row.source}-${row.utm_campaign}-${row.utm_content}-${row.entry_post_slug}-${row.cta_keyword}`}>
                        <td className="py-3 pr-4 text-stone-950">{row.source || row.utm_source || "direct"}</td>
                        <td className="py-3 pr-4 text-stone-500">{row.utm_campaign || "-"}</td>
                        <td className="py-3 pr-4 text-stone-500">{row.utm_content || "-"}</td>
                        <td className="py-3 pr-4 text-stone-500">{row.entry_post_slug || "-"}</td>
                        <td className="py-3 pr-4 text-stone-500">{row.cta_keyword || "-"}</td>
                        <td className="py-3 pr-4 text-right text-stone-950">{row.checkout_starts}</td>
                        <td className="py-3 pr-4 text-right text-stone-950">{row.purchases}</td>
                        <td className="py-3 text-right text-stone-950">{row.recovery_sends}</td>
                        <td className="py-3 text-right text-stone-950">{row.unrecoverable_starts || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-stone-500">
                No Prompt Vault checkout attribution rows in this window yet. Use tagged links from ManyChat, stories, reels, and email.
              </p>
            )}
          </section>

          <section className="border border-stone-200 bg-white p-6">
            <h2 className="mb-5 font-['Times_New_Roman'] text-xl uppercase tracking-[0.2em] text-stone-950 sm:text-2xl">
              FREE PROMPT DEMAND
            </h2>
            {freePromptSignals.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {freePromptSignals.map((prompt) => (
                  <div key={`${prompt.prompt_number}-${prompt.prompt_title}`} className="flex items-center justify-between gap-4 py-4">
                    <p className="text-sm text-stone-950">
                      {prompt.prompt_number ? `${prompt.prompt_number}. ` : ""}
                      {safeText(prompt.prompt_title, "Untitled prompt")}
                    </p>
                    <p className="font-['Times_New_Roman'] text-2xl text-stone-950">{prompt.copies}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-stone-500">
                No free prompt copy events in this window yet.
              </p>
            )}
          </section>

          <section className="border border-stone-200 bg-white p-6">
            <h2 className="mb-5 font-['Times_New_Roman'] text-xl uppercase tracking-[0.2em] text-stone-950 sm:text-2xl">
              RECENT IG SIGNALS
            </h2>
            {recentIgSignals.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {recentIgSignals.map((signal) => (
                  <div key={signal.id} className="py-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm text-stone-950">@{signal.username}</p>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-stone-400">
                        {signal.channel} · {signal.status}
                      </p>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-stone-500">
                      {signal.latest_message || "No message preview"}
                    </p>
                    {(signal.growth_tags || []).length > 0 && (
                      <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-stone-400">
                        {(signal.growth_tags || []).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-stone-500">
                No IG conversations in this window yet. Webhook tests will appear here too.
              </p>
            )}
          </section>
        </div>

        <section className="mt-6 border border-stone-200 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.2em] text-stone-950 sm:text-2xl">
                OPERATING LOOP
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-500">
                Use this page before deciding what to post or sell: first check IG demand language, then free prompt copies,
                then Vault checkout attribution, then paid prompt copies. The next reel should come from the strongest emotional
                reaction plus the strongest prompt usage signal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/prompt-vault" className="border border-stone-300 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-stone-700 hover:border-stone-950">
                Prompt Vault
              </Link>
              <Link href="/admin/ig-inbox" className="border border-stone-950 bg-stone-950 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-stone-50">
                IG Inbox
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
