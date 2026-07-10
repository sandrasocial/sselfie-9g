import Link from "next/link"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin/admin-nav"
import { getAdminHomeReport } from "@/lib/admin/home-report"
import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"
import { getOrCreateNeonUser, getUserByAuthId } from "@/lib/user-mapping"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

function money(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

function freshWithin(value: string | null, days: number) {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) && Date.now() - timestamp <= days * 24 * 60 * 60 * 1000
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center bg-stone-950 px-4 text-xs uppercase tracking-[0.14em] text-white transition hover:bg-stone-800"
    >
      {children}
    </Link>
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

  if (!user) redirect("/auth/login")

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
  const scorecard = report.scorecard
  const applicationTotal = scorecard?.workWithMe.receivedTotal || 0
  const applications30d = scorecard?.workWithMe.applications30d || 0
  const contentIsFresh = freshWithin(report.content.briefGeneratedAt, 8)
  const systemsNeedingAttention = report.team.employees.filter(
    (employee) => employee.status === "needs-setup" || employee.lastResult === "failed",
  )
  const dmApprovalCount = report.needsMe.approvalActions.filter(
    (action) => action.source === "ig_conversations",
  ).length
  const founderDecisionCount =
    report.needsMe.approvalActions.length +
    report.needsMe.webhookReviews +
    report.needsMe.newSupportThreads +
    Math.max(0, report.needsMe.flaggedConversations - dmApprovalCount)

  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {params.ig_connected ? (
          <p className="mb-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Instagram connected: @{params.ig_connected}
          </p>
        ) : null}
        {params.ig_error ? (
          <p className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Instagram connection failed: {params.ig_error}
            {params.detail ? ` (${decodeURIComponent(params.detail)})` : ""}
          </p>
        ) : null}

        <header className="flex flex-col gap-5 border-b border-stone-300 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Founder home</p>
            <h1 className="mt-2 font-serif text-5xl font-light tracking-tight">Today, clearly.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
              Decisions first. Business truth second. System detail only when something is broken.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
            <span>
              Instagram: {igConnection ? `@${igConnection.instagram_username}` : "not connected"}
              {igTokenExpiresSoon ? " · reconnect soon" : ""}
            </span>
            <a className="underline underline-offset-4" href="/api/instagram/connect?redirect=1">
              {igConnection ? "Reconnect" : "Connect"}
            </a>
          </div>
        </header>

        <section className="mt-7 grid gap-px overflow-hidden border border-stone-300 bg-stone-300 md:grid-cols-3">
          <div className="bg-white p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">Money</p>
            <p className="mt-4 font-serif text-4xl font-light">{money(report.money.last48h.revenue)}</p>
            <p className="mt-2 text-sm text-stone-600">
              {report.money.last48h.payments} payments in 48h · {money(report.money.week.revenue)} this week
            </p>
          </div>
          <div className="bg-white p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">Private work</p>
            <p className="mt-4 font-serif text-4xl font-light">{applicationTotal}</p>
            <p className="mt-2 text-sm text-stone-600">
              applications received · {applications30d} in the last 30 days
            </p>
          </div>
          <div className="bg-white p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">Needs you</p>
            <p className="mt-4 font-serif text-4xl font-light">{founderDecisionCount}</p>
            <p className="mt-2 text-sm text-stone-600">real decisions across replies, payments, and fresh support</p>
          </div>
        </section>

        <section className="mt-8 border border-stone-950 bg-white">
          <div className="flex flex-col gap-3 border-b border-stone-200 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">Founder approvals</p>
              <h2 className="mt-2 font-serif text-3xl font-light">Only actions waiting for your yes.</h2>
              <p className="mt-2 text-sm text-stone-600">Nothing sends until you review and confirm it.</p>
            </div>
            <span className="text-sm text-stone-500">{report.needsMe.approvalActions.length} waiting</span>
          </div>

          {report.needsMe.approvalActions.length > 0 ? (
            <div className="divide-y divide-stone-200">
              {report.needsMe.approvalActions.map((action) => (
                <article key={action.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
                  <div className="min-w-0">
                    <p className="font-serif text-xl leading-tight">{action.title}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{action.summary}</p>
                    {action.status === "failed" ? (
                      <p className="mt-2 text-xs font-medium text-red-700">This action failed and needs a fresh review.</p>
                    ) : null}
                  </div>
                  <ActionLink href={action.link}>Review</ActionLink>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-stone-600">No sends are waiting for approval.</div>
          )}
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-3">
          <Link href="/admin/ig-inbox" className="border border-stone-300 bg-white p-5 transition hover:border-stone-950">
            <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Instagram</p>
            <p className="mt-3 font-serif text-3xl font-light">{report.needsMe.flaggedConversations}</p>
            <p className="mt-1 text-sm text-stone-600">DMs that may need a human reply</p>
          </Link>
          <Link href="/admin/webhook-review" className="border border-stone-300 bg-white p-5 transition hover:border-stone-950">
            <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Payments</p>
            <p className="mt-3 font-serif text-3xl font-light">{report.needsMe.webhookReviews}</p>
            <p className="mt-1 text-sm text-stone-600">payment events needing review</p>
          </Link>
          <Link href="/admin/customer-support" className="border border-stone-300 bg-white p-5 transition hover:border-stone-950">
            <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Support</p>
            <p className="mt-3 font-serif text-3xl font-light">{report.needsMe.newSupportThreads}</p>
            <p className="mt-1 text-sm text-stone-600">new threads from the last 30 days</p>
          </Link>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-stone-950 p-6 text-white sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Higher Self Command Center</p>
            <h2 className="mt-4 font-serif text-3xl font-light">{report.commandCenter.moneyMove.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-200">{report.commandCenter.moneyMove.action}</p>
            <p className="mt-3 max-w-xl text-xs leading-5 text-stone-400">{report.commandCenter.moneyMove.reason}</p>
            <div className="mt-6">
              <Link
                href={report.commandCenter.moneyMove.link.href}
                className="inline-flex min-h-11 items-center border border-white px-4 text-xs uppercase tracking-[0.14em] transition hover:bg-white hover:text-stone-950"
              >
                {report.commandCenter.moneyMove.link.label}
              </Link>
            </div>
            <p className="mt-6 max-w-xl border-t border-white/15 pt-4 text-xs leading-5 text-stone-400">
              <span className="text-stone-300">CEO rule today:</span> {report.commandCenter.ceoRule}
            </p>
          </div>
          <div className="border border-stone-300 bg-white p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">Content today</p>
            {contentIsFresh && report.content.nextPostHook ? (
              <>
                <p className="mt-4 font-serif text-2xl leading-tight">“{report.content.nextPostHook}”</p>
                <p className="mt-4 text-sm leading-6 text-stone-600">
                  Use this only if it supports today’s money move. You do not need another content system.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm leading-6 text-stone-600">
                No fresh brief is being presented as today’s truth. Open the content brief when you are ready to create.
              </p>
            )}
            <Link href="/admin/content-brief" className="mt-6 inline-block text-xs uppercase tracking-[0.14em] underline underline-offset-4">
              Open content brief
            </Link>
          </div>
        </section>

        <details className="mt-8 border border-stone-300 bg-white">
          <summary className="cursor-pointer list-none p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">Business details</p>
                <p className="mt-2 font-serif text-2xl font-light">Revenue, members, and funnel truth</p>
              </div>
              <span className="text-sm text-stone-500">Open</span>
            </div>
          </summary>
          <div className="grid gap-px border-t border-stone-200 bg-stone-200 md:grid-cols-2">
            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Revenue</p>
              <p className="mt-3 font-serif text-3xl font-light">{money(report.money.month.revenue)}</p>
              <p className="mt-1 text-sm text-stone-600">{report.money.month.payments} payments in 30 days</p>
              <ul className="mt-5 space-y-2 text-sm">
                {report.money.byProduct.slice(0, 6).map((row) => (
                  <li key={row.product} className="flex justify-between gap-4">
                    <span>{row.product}</span>
                    <span className="text-stone-500">{row.payments} · {money(row.revenue)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Paying members</p>
              <p className="mt-3 font-serif text-3xl font-light">{report.members.active}</p>
              <p className="mt-1 text-sm text-stone-600">{currencyBreakdown(report.members.mrrByCurrency)} net MRR</p>
              <p className="mt-5 text-sm leading-6 text-stone-600">
                {report.members.new30d} new · {report.members.canceled30d} canceled in 30 days · {report.trials.active} active trials
              </p>
            </div>
            {scorecard ? (
              <div className="bg-white p-5 sm:col-span-2 sm:p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Funnels, last 30 days</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {scorecard.funnels30d.slice(0, 6).map((row) => (
                    <div key={row.productType} className="border-t border-stone-200 pt-3 text-sm">
                      <p>{row.productType}</p>
                      <p className="mt-1 text-stone-500">{row.starts} starts · {row.purchases} purchases · {money(row.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </details>

        <section className="mt-4 border border-stone-300 bg-white">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">Team</p>
              <p className="mt-2 font-serif text-2xl font-light">
                {report.team.diagnostics.errors24h + systemsNeedingAttention.length === 0
                  ? "No system exception needs you."
                  : `${report.team.diagnostics.errors24h + systemsNeedingAttention.length} exception${report.team.diagnostics.errors24h + systemsNeedingAttention.length === 1 ? "" : "s"} to inspect.`}
              </p>
              <p className="mt-2 text-sm text-stone-600">
                DM bridge truth: {report.team.dmBridge.messages7d} messages captured in the last 7 days ·{" "}
                {report.team.dmBridge.conversationsAllTime} conversations all-time.
              </p>
            </div>
            <span className="text-sm text-stone-500">Technical detail stays collapsed</span>
          </div>
          <details className="border-t border-stone-200">
            <summary className="cursor-pointer px-5 py-4 text-sm text-stone-600 sm:px-6">View system details</summary>
            <div className="divide-y divide-stone-200 border-t border-stone-200">
              {report.team.employees.map((employee) => (
                <div key={`${employee.name}-${employee.destination}`} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[180px_90px_1fr] sm:px-6">
                  <p>{employee.name}</p>
                  <p className="uppercase tracking-[0.12em] text-stone-500">{employee.status}</p>
                  <p className="text-stone-600">{employee.lastResult}</p>
                </div>
              ))}
            </div>
          </details>
        </section>
      </main>
    </div>
  )
}
