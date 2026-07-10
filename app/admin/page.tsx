import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin/admin-nav"
import { getAdminHomeReport } from "@/lib/admin/home-report"
import { sql } from "@/lib/db/client"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

function money(value: number) {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function currencyMoney(value: number, currency: string) {
  const normalized = currency.toUpperCase()
  const symbol = normalized === "EUR" ? "€" : normalized === "USD" ? "$" : `${normalized} `
  return symbol + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function currencyBreakdown(values: Record<string, number>) {
  const entries = Object.entries(values || {}).filter(([, value]) => Number(value) > 0)
  if (entries.length === 0) return "$0.00"
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, value]) => currencyMoney(value, currency))
    .join(" + ")
}

function percent(part: number, whole: number) {
  if (!whole) return "0%"
  return Math.round((part / whole) * 100) + "%"
}

function SourceTag({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-stone-500">
      {label}
    </span>
  )
}

function CommandMoveCard({
  eyebrow,
  move,
}: {
  eyebrow: string
  move: {
    title: string
    action: string
    reason: string
    source: string
    link: { label: string; href: string }
  }
}) {
  return (
    <Link
      href={move.link.href}
      className="block rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-950"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs uppercase tracking-wide text-stone-500">{eyebrow}</p>
        <SourceTag label={move.source} />
      </div>
      <p className="mt-3 font-serif text-xl leading-tight text-stone-950">{move.title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-700">{move.action}</p>
      <p className="mt-3 text-xs leading-5 text-stone-500">{move.reason}</p>
      <p className="mt-4 text-xs uppercase tracking-wide text-stone-950 underline underline-offset-4">
        {move.link.label} →
      </p>
    </Link>
  )
}

function TeamStatusBadge({ status }: { status: string }) {
  const classes =
    status === "live"
      ? "bg-green-50 text-green-800"
      : status === "needs-setup"
        ? "bg-amber-50 text-amber-800"
        : status === "paused"
          ? "bg-stone-100 text-stone-500"
          : "bg-blue-50 text-blue-800"
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${classes}`}>
      {status}
    </span>
  )
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ig_connected?: string; ig_error?: string; detail?: string }>
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  let neonUser = null
  try {
    neonUser = await getUserByAuthId(user.id)
    if (!neonUser && user.email) {
      neonUser = await getOrCreateNeonUser(
        user.id,
        user.email,
        user.user_metadata?.name || user.user_metadata?.display_name,
      )
    }
  } catch (error) {
    console.error("[admin] user sync failed:", error)
  }

  if (!neonUser) redirect("/auth/login")
  if (neonUser.email !== ADMIN_EMAIL) redirect("/")

  const params = await searchParams
  const report = await getAdminHomeReport()

  // Instagram connection status for the content engine (source: instagram_connections).
  // The Connect button lives here because the OAuth callback redirects back to /admin.
  let igConnection: { instagram_username: string; token_expires_at: Date | null } | null = null
  try {
    const rows = (await sql`
      SELECT instagram_username, token_expires_at
      FROM instagram_connections
      WHERE is_active = true
      ORDER BY id DESC
      LIMIT 1
    `) as Array<{ instagram_username: string; token_expires_at: Date | null }>
    igConnection = rows[0] || null
  } catch (error) {
    console.error("[admin] instagram connection lookup failed:", error)
  }
  const igTokenExpiresSoon = Boolean(
    igConnection?.token_expires_at &&
      new Date(igConnection.token_expires_at).getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000,
  )

  const needsTotal =
    report.needsMe.flaggedConversations +
    report.needsMe.webhookReviews +
    report.needsMe.newSupportThreads +
    report.needsMe.approvalActions.length

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {params.ig_connected && (
          <p className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            Instagram connected: @{params.ig_connected}
          </p>
        )}
        {params.ig_error && (
          <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            Instagram connection failed: {params.ig_error}
            {params.detail ? ` (${decodeURIComponent(params.detail)})` : ""}
          </p>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3">
          <p className="text-sm text-stone-600">
            Instagram:{" "}
            {igConnection ? (
              <>
                @{igConnection.instagram_username} connected
                {igTokenExpiresSoon ? " · token expires soon" : ""}
              </>
            ) : (
              "not connected"
            )}
            <span className="ml-2 align-middle">
              <SourceTag label="instagram_connections" />
            </span>
          </p>
          <a
            href="/api/instagram/connect?redirect=1"
            className="text-xs uppercase tracking-wide text-stone-950 underline underline-offset-4"
          >
            {igConnection ? "Reconnect" : "Connect Instagram"}
          </a>
        </div>

        <h1 className="font-serif text-3xl font-light tracking-tight text-stone-950">
          Hey Sandra
        </h1>

        <section className="mt-6 rounded-2xl border border-stone-950 bg-stone-950 p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xs uppercase tracking-wide text-stone-300">Higher Self Command Center</h2>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-stone-300">
              purpose lock
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-stone-300">
              stripe_payments
            </span>
          </div>
          <div className="mt-4 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="font-serif text-3xl leading-tight sm:text-4xl">
                {report.commandCenter.headline}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
                {report.commandCenter.truth}
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-200">
                {report.commandCenter.coreLock}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-stone-300">CEO rule today</p>
              <p className="mt-2 text-sm leading-6 text-white">{report.commandCenter.ceoRule}</p>
              <p className="mt-4 text-xs text-stone-300">
                Last 48h: {report.money.last48h.payments} payments · {money(report.money.last48h.revenue)}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-3 grid gap-3 lg:grid-cols-3">
          <CommandMoveCard eyebrow="Money move" move={report.commandCenter.moneyMove} />
          <CommandMoveCard eyebrow="Offer bridge" move={report.commandCenter.offerBridge} />
          <CommandMoveCard eyebrow="Follow-up loop" move={report.commandCenter.followUpMove} />
        </section>

        <section className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs uppercase tracking-wide text-stone-500">Story to post today</p>
              <SourceTag label={report.commandCenter.storyMove.source} />
            </div>
            <p className="mt-3 font-serif text-2xl leading-tight text-stone-950">
              {report.commandCenter.storyMove.title}
            </p>
            <p className="mt-2 text-sm text-stone-600">
              Anchor: {report.commandCenter.storyMove.anchor}
            </p>
            <p className="mt-4 text-sm leading-6 text-stone-800">
              {report.commandCenter.storyMove.opener}
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
              {report.commandCenter.storyMove.frames.map((frame) => (
                <li key={frame} className="border-l border-stone-200 pl-3">
                  {frame}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm leading-6 text-stone-800">
              {report.commandCenter.storyMove.bridge}
            </p>
          </div>
          <CommandMoveCard eyebrow="One system improvement" move={report.commandCenter.systemMove} />
        </section>

        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xs uppercase tracking-wide text-stone-500">Team</h2>
              <p className="mt-1 text-sm text-stone-600">
                The working systems, dormant employees, and silent-dead bridges in one place.
              </p>
            </div>
            <SourceTag label="admin_cron_runs + diagnostics" />
          </div>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            DM bridge truth: {report.team.dmBridge.messages7d} messages captured in the last 7 days ·{" "}
            {report.team.dmBridge.conversationsAllTime} conversations all-time.
          </div>
          <div className="mt-4 divide-y divide-stone-100">
            {report.team.employees.map((employee) => (
              <div key={`${employee.name}-${employee.destination}`} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-serif text-lg leading-tight text-stone-950">{employee.name}</p>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{employee.role}</p>
                  </div>
                  <TeamStatusBadge status={employee.status} />
                </div>
                <div className="mt-2 grid gap-2 text-xs text-stone-500 sm:grid-cols-3">
                  <p>Last run: {employee.lastRun || "not logged"}</p>
                  <p>Result: {employee.lastResult}</p>
                  <p>Output: {employee.destination}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 1. How much money? */}
        <section className="mt-8">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xs uppercase tracking-wide text-stone-500">Money</h2>
            <SourceTag label="stripe_payments" />
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Historical revenue only. Payments are charge rows, not active members.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-stone-500">This week</p>
              <p className="mt-1 font-serif text-3xl text-stone-950">{money(report.money.week.revenue)}</p>
              <p className="text-sm text-stone-600">{report.money.week.payments} payments</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-stone-500">Last 30 days</p>
              <p className="mt-1 font-serif text-3xl text-stone-950">{money(report.money.month.revenue)}</p>
              <p className="text-sm text-stone-600">{report.money.month.payments} payments</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-stone-500">By product (30d)</p>
            <ul className="mt-2 space-y-1">
              {report.money.byProduct.map((row) => (
                <li key={row.product} className="flex items-baseline justify-between text-sm">
                  <span className="text-stone-800">{row.product}</span>
                  <span className="text-stone-500">
                    {row.payments} · <span className="text-stone-800">{money(row.revenue)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 2. Members */}
        <section className="mt-8">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xs uppercase tracking-wide text-stone-500">Paying members</h2>
            <SourceTag label={report.members.source === "stripe_live" ? "Stripe live" : "DB fallback"} />
          </div>
          <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <div>
                <p className="font-serif text-3xl text-stone-950">{report.members.active}</p>
                <p className="text-xs uppercase tracking-wide text-stone-500">active members</p>
              </div>
              <div>
                <p className="font-serif text-3xl text-stone-950">{currencyBreakdown(report.members.mrrByCurrency)}</p>
                <p className="text-xs uppercase tracking-wide text-stone-500">MRR · live Stripe · net of discounts</p>
              </div>
              <div className="text-sm text-stone-600">
                +{report.members.new30d} new · {report.members.canceled30d} canceled (30d)
              </div>
            </div>
            <div className="mt-3 text-sm text-stone-600">
              {report.members.discountedMembers > 0 && (
                <>
                  {report.members.discountedMembers} of {report.members.active} on a lifetime beta
                  discount (BETA 50% forever) · {currencyBreakdown(report.members.grossMrrByCurrency)} at list price
                </>
              )}
            </div>
            {(report.trials.active > 0 || report.trials.expired > 0) && (
              <div className="mt-2 border-t border-stone-100 pt-2 text-sm text-stone-600">
                Trials (not members, source: subscriptions): {report.trials.active} active ·{" "}
                {report.trials.expired} expired · {report.trials.converted} converted to paid
              </div>
            )}
            <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-500">Founding annual launch</p>
                  <p className="mt-1 text-stone-900">
                    {report.launch.foundingAnnual.sold} of {report.launch.foundingAnnual.cap} founding spots sold
                  </p>
                </div>
                <SourceTag label="subscriptions" />
              </div>
              <p className="mt-2 text-xs text-stone-500">
                {report.launch.foundingAnnual.available
                  ? `${report.launch.foundingAnnual.remaining} spots left before the founding link closes.`
                  : "Founding link is closed; annual checkout falls back to the standing annual price."}
              </p>
            </div>
            {report.studioHealth && (
              <div className="mt-5 border-t border-stone-100 pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs uppercase tracking-wide text-stone-500">Studio member health</p>
                    <SourceTag label="subscriptions + generation tables" />
                  </div>
                  <p className="text-xs text-stone-500">
                    {report.studioHealth.neverGeneratedRealMembers} real members at churn risk
                  </p>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-stone-50 p-3">
                    <p className="font-serif text-2xl text-stone-950">
                      {percent(report.studioHealth.trainingCompleted, report.studioHealth.totalMembers)}
                    </p>
                    <p className="text-xs text-stone-500">
                      {report.studioHealth.trainingCompleted}/{report.studioHealth.totalMembers} trained
                    </p>
                  </div>
                  <div className="rounded-xl bg-stone-50 p-3">
                    <p className="font-serif text-2xl text-stone-950">
                      {percent(report.studioHealth.everGenerated, report.studioHealth.totalMembers)}
                    </p>
                    <p className="text-xs text-stone-500">
                      {report.studioHealth.everGenerated}/{report.studioHealth.totalMembers} generated
                    </p>
                  </div>
                  <div className="rounded-xl bg-stone-50 p-3">
                    <p className="font-serif text-2xl text-stone-950">
                      {percent(report.studioHealth.neverGenerated, report.studioHealth.totalMembers)}
                    </p>
                    <p className="text-xs text-stone-500">
                      {report.studioHealth.neverGenerated}/{report.studioHealth.totalMembers} never generated
                    </p>
                  </div>
                  <div className="rounded-xl bg-stone-50 p-3">
                    <p className="font-serif text-2xl text-stone-950">{report.studioHealth.proGenerators}</p>
                    <p className="text-xs text-stone-500">used Pro mode</p>
                  </div>
                </div>
                {report.studioHealth.neverGeneratedMembers.length > 0 && (
                  <div className="mt-3 rounded-xl bg-stone-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-stone-500">Never generated</p>
                    <ul className="mt-2 space-y-1 text-sm text-stone-700">
                      {report.studioHealth.neverGeneratedMembers.map((member: { id: string; email: string; isSmokeTest?: boolean }) => (
                        <li key={member.id} className="flex flex-wrap items-center justify-between gap-2">
                          <span>{member.email}</span>
                          {member.isSmokeTest && (
                            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-stone-500">
                              smoke test
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {report.scorecard && (
          <section className="mt-8">
            <div className="flex items-baseline gap-2">
              <h2 className="text-xs uppercase tracking-wide text-stone-500">Daily business scorecard</h2>
              <SourceTag label="Revenue Truth" />
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-white p-5">
                <p className="text-xs uppercase tracking-wide text-stone-500">Trial activation</p>
                <p className="mt-2 text-sm text-stone-700">
                  {report.scorecard.trials.claimed30d} claimed · {report.scorecard.trials.firstGeneration30d} first generated ·{" "}
                  {report.scorecard.trials.downloads30d} downloaded · {report.scorecard.trials.paymentFormRendered30d} payment forms
                </p>
                <p className="mt-2 text-xs text-stone-500">Source: subscriptions + analytics_events</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-5">
                <p className="text-xs uppercase tracking-wide text-stone-500">Work With Me pipeline</p>
                <p className="mt-2 text-sm text-stone-700">
                  {report.scorecard.workWithMe.applications30d} applications · {report.scorecard.workWithMe.qualifiedOpen} qualified ·{" "}
                  {report.scorecard.workWithMe.bookedCalls} booked · {report.scorecard.workWithMe.won} won
                </p>
                <p className="mt-2 text-xs text-stone-500">Source: brand_engine_applications</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-5">
                <p className="text-xs uppercase tracking-wide text-stone-500">Best converting emails</p>
                <ul className="mt-2 space-y-1 text-sm text-stone-700">
                  {report.scorecard.demandSignals.topEmailConverters.slice(0, 3).map((row) => (
                    <li key={row.emailType} className="flex justify-between gap-3">
                      <span className="truncate">{row.emailType}</span>
                      <span className="shrink-0 text-stone-500">
                        {row.clicks} clicks · {row.conversions} conv.
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-stone-500">Source: email_logs</p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-white p-5">
                <p className="text-xs uppercase tracking-wide text-stone-500">Funnel truth (30d)</p>
                <ul className="mt-2 space-y-1">
                  {report.scorecard.funnels30d.slice(0, 5).map((row) => (
                    <li key={row.productType} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-stone-800">{row.productType}</span>
                      <span className="text-right text-stone-500">
                        {row.starts} starts · {row.purchases} buys · {money(row.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-stone-500">Source: checkout_attribution</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-5">
                <p className="text-xs uppercase tracking-wide text-stone-500">Demand signals</p>
                <ul className="mt-2 space-y-1">
                  {report.scorecard.demandSignals.topFreePromptCopies.slice(0, 5).map((row) => (
                    <li key={row.title} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate text-stone-800">{row.title}</span>
                      <span className="shrink-0 text-stone-500">{row.copies} copies</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-stone-500">Source: analytics_events</p>
              </div>
            </div>
          </section>
        )}

        {/* 3. What needs me today? */}
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-wide text-stone-500">Needs you today</h2>
          {needsTotal === 0 ? (
            <p className="mt-3 rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-700">
              Nothing needs you. Go make content.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {report.needsMe.approvalActions.length > 0 && (
                <div className="rounded-2xl border border-stone-950 bg-white p-5">
                  <p className="text-xs uppercase tracking-wide text-stone-500">Ready for approval</p>
                  <div className="mt-3 divide-y divide-stone-100">
                    {report.needsMe.approvalActions.map((action) => (
                      <div key={action.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-serif text-lg text-stone-950">{action.title}</p>
                          <p className="mt-1 text-sm leading-6 text-stone-600">{action.summary}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-stone-400">
                            {action.source} · {action.status}
                          </p>
                        </div>
                        <Link
                          href={action.link}
                          className="shrink-0 rounded-full bg-stone-950 px-4 py-2 text-center text-xs uppercase tracking-wide text-white"
                        >
                          Review
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
              <Link
                href="/admin/ig-inbox"
                className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-950"
              >
                <p className="font-serif text-3xl text-stone-950">{report.needsMe.flaggedConversations}</p>
                <p className="text-xs uppercase tracking-wide text-stone-500">flagged DMs</p>
              </Link>
              <Link
                href="/admin/webhook-review"
                className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-950"
              >
                <p className="font-serif text-3xl text-stone-950">{report.needsMe.webhookReviews}</p>
                <p className="text-xs uppercase tracking-wide text-stone-500">payment reviews</p>
              </Link>
              <Link
                href="/admin/customer-support"
                className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-950"
              >
                <p className="font-serif text-3xl text-stone-950">{report.needsMe.newSupportThreads}</p>
                <p className="text-xs uppercase tracking-wide text-stone-500">new support threads</p>
              </Link>
              </div>
            </div>
          )}
        </section>

        {/* 4. Next content move */}
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-wide text-stone-500">Your next content move</h2>
          <Link
            href="/admin/content-brief"
            className="mt-3 block rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-950"
          >
            {report.content.nextPostHook ? (
              <>
                <p className="font-serif text-lg text-stone-950">&quot;{report.content.nextPostHook}&quot;</p>
                {report.content.topPrompt && (
                  <p className="mt-2 text-sm text-stone-600">
                    Strongest demand signal: {report.content.topPrompt.title} ({report.content.topPrompt.copies} copies)
                  </p>
                )}
                <p className="mt-2 text-xs uppercase tracking-wide text-stone-500">
                  Open content tools →
                </p>
              </>
            ) : (
              <p className="text-sm text-stone-700">
                Open Shoot Studio, Carousel Kit, or Story Sequences.
              </p>
            )}
          </Link>
        </section>
      </main>
    </div>
  )
}
