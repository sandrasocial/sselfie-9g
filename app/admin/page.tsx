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

function SourceTag({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-stone-500">
      {label}
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
    report.needsMe.newSupportThreads

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

        {/* 1. How much money? */}
        <section className="mt-8">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xs uppercase tracking-wide text-stone-500">Money</h2>
            <SourceTag label="stripe_payments" />
          </div>
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
                <p className="font-serif text-3xl text-stone-950">{money(report.members.mrr)}</p>
                <p className="text-xs uppercase tracking-wide text-stone-500">MRR · net of discounts</p>
              </div>
              <div className="text-sm text-stone-600">
                +{report.members.new30d} new · {report.members.canceled30d} canceled (30d)
              </div>
            </div>
            <div className="mt-3 text-sm text-stone-600">
              {report.members.discountedMembers > 0 && (
                <>
                  {report.members.discountedMembers} of {report.members.active} on a lifetime beta
                  discount (BETA 50% forever) · {money(report.members.grossMrr)} at list price
                </>
              )}
            </div>
            {(report.trials.active > 0 || report.trials.expired > 0) && (
              <div className="mt-2 border-t border-stone-100 pt-2 text-sm text-stone-600">
                Trials (not members, source: subscriptions): {report.trials.active} active ·{" "}
                {report.trials.expired} expired · {report.trials.converted} converted to paid
              </div>
            )}
          </div>
        </section>

        {/* 3. What needs me today? */}
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-wide text-stone-500">Needs you today</h2>
          {needsTotal === 0 ? (
            <p className="mt-3 rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-700">
              Nothing needs you. Go make content.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
                <p className="font-serif text-lg text-stone-950">"{report.content.nextPostHook}"</p>
                {report.content.topPrompt && (
                  <p className="mt-2 text-sm text-stone-600">
                    Strongest demand signal: {report.content.topPrompt.title} ({report.content.topPrompt.copies} copies)
                  </p>
                )}
                <p className="mt-2 text-xs uppercase tracking-wide text-stone-500">
                  Open the weekly brief →
                </p>
              </>
            ) : (
              <p className="text-sm text-stone-700">
                No brief yet. Open the content page and hit "Generate this week's brief".
              </p>
            )}
          </Link>
        </section>
      </main>
    </div>
  )
}
