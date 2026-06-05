import Link from "next/link"
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Download,
  Eye,
  Mail,
  MousePointerClick,
  Sparkles,
} from "lucide-react"

import { AdminNav } from "@/components/admin/admin-nav"
import { AdminMetricCard } from "@/components/admin/shared"
import { ensureAnalyticsSchema } from "@/lib/analytics/schema"
import { sql } from "@/lib/db/client"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"

export const dynamic = "force-dynamic"

type EventCounts = {
  landing_views: number
  checkout_starts: number
  checkout_successes: number
  access_opens: number
  module_starts: number
  module_completions: number
  workbook_downloads: number
  visual_code_saves: number
  maya_prompt_packs: number
  prompt_copies: number
  final_selects: number
  content_plans: number
  testimonial_requests: number
  testimonial_submissions: number
  recovery_sends: number
}

type PaymentCounts = {
  purchases: number
  revenue_cents: number
  first_purchase_at: string | null
  latest_purchase_at: string | null
}

type EmailCounts = {
  delivery_sent: number
  day1_sent: number
  day3_sent: number
  day5_sent: number
  day7_sent: number
  recovery_sent: number
}

type ModuleRow = {
  module: string | null
  starts: number
  completions: number
}

type RecentPurchaseRow = {
  payment_date: string
  amount_cents: number
  currency: string | null
  stripe_payment_id: string | null
}

function toInt(value: unknown): number {
  return Number(value || 0)
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

function pct(numerator: number, denominator: number): string {
  if (!denominator) return "0%"
  return `${Math.round((numerator / denominator) * 100)}%`
}

async function getMetrics(windowDays: number) {
  await ensureAnalyticsSchema()
  await ensureRevenueEngineSchema()

  const [eventCountsRow] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_landing_view')::int AS landing_views,
      COUNT(*) FILTER (
        WHERE event_name = 'selfie_to_brand_shoot_checkout_start'
          OR (event_name = 'checkout_start' AND properties->>'product_type' = 'selfie_to_brand_shoot_system')
      )::int AS checkout_starts,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_checkout_success')::int AS checkout_successes,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_access_opened')::int AS access_opens,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_module_started')::int AS module_starts,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_module_completed')::int AS module_completions,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_workbook_downloaded')::int AS workbook_downloads,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_visual_code_saved')::int AS visual_code_saves,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_maya_prompt_pack_built')::int AS maya_prompt_packs,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_prompt_pack_copied')::int AS prompt_copies,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_final_selects_completed')::int AS final_selects,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_content_plan_completed')::int AS content_plans,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_testimonial_requested')::int AS testimonial_requests,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_testimonial_submitted')::int AS testimonial_submissions,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_checkout_recovery_sent')::int AS recovery_sends
    FROM analytics_events
    WHERE created_at > NOW() - (${`${windowDays} days`}::interval)
  `

  const [paymentCountsRow] = await sql`
    SELECT
      COUNT(*)::int AS purchases,
      COALESCE(SUM(amount_cents), 0)::int AS revenue_cents,
      MIN(payment_date)::text AS first_purchase_at,
      MAX(payment_date)::text AS latest_purchase_at
    FROM stripe_payments
    WHERE payment_date > NOW() - (${`${windowDays} days`}::interval)
      AND status IN ('succeeded', 'paid')
      AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      AND (product_type = 'selfie_to_brand_shoot_system' OR payment_type = 'selfie_to_brand_shoot_system')
  `

  const [emailCountsRow] = await sql`
    SELECT
      COUNT(DISTINCT user_email) FILTER (WHERE email_type IN ('selfie_to_brand_shoot_delivery', 'selfie-to-brand-shoot-delivery', 'selfie-to-brand-shoot-system-delivery'))::int AS delivery_sent,
      COUNT(DISTINCT user_email) FILTER (WHERE email_type = 'selfie-to-brand-shoot-day1-source-and-world')::int AS day1_sent,
      COUNT(DISTINCT user_email) FILTER (WHERE email_type = 'selfie-to-brand-shoot-day3-first-shoot')::int AS day3_sent,
      COUNT(DISTINCT user_email) FILTER (WHERE email_type = 'selfie-to-brand-shoot-day5-select-and-content')::int AS day5_sent,
      COUNT(DISTINCT user_email) FILTER (WHERE email_type = 'selfie-to-brand-shoot-day7-proof-request')::int AS day7_sent,
      COUNT(DISTINCT user_email) FILTER (WHERE email_type = 'selfie-to-brand-shoot-checkout-recovery')::int AS recovery_sent
    FROM email_logs
    WHERE sent_at > NOW() - (${`${windowDays} days`}::interval)
      AND status IN ('sent', 'delivered', 'suppressed')
  `

  const moduleRows = (await sql`
    SELECT
      NULLIF(properties->>'module', '') AS module,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_module_started')::int AS starts,
      COUNT(*) FILTER (WHERE event_name = 'selfie_to_brand_shoot_module_completed')::int AS completions
    FROM analytics_events
    WHERE created_at > NOW() - (${`${windowDays} days`}::interval)
      AND event_name IN ('selfie_to_brand_shoot_module_started', 'selfie_to_brand_shoot_module_completed')
    GROUP BY 1
    ORDER BY NULLIF(properties->>'module', '') ASC NULLS LAST
  `) as ModuleRow[]

  const recentPurchases = (await sql`
    SELECT
      payment_date::text AS payment_date,
      amount_cents::int AS amount_cents,
      currency,
      stripe_payment_id
    FROM stripe_payments
    WHERE payment_date > NOW() - (${`${windowDays} days`}::interval)
      AND status IN ('succeeded', 'paid')
      AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      AND (product_type = 'selfie_to_brand_shoot_system' OR payment_type = 'selfie_to_brand_shoot_system')
    ORDER BY payment_date DESC
    LIMIT 10
  `) as RecentPurchaseRow[]

  return {
    events: {
      landing_views: toInt(eventCountsRow?.landing_views),
      checkout_starts: toInt(eventCountsRow?.checkout_starts),
      checkout_successes: toInt(eventCountsRow?.checkout_successes),
      access_opens: toInt(eventCountsRow?.access_opens),
      module_starts: toInt(eventCountsRow?.module_starts),
      module_completions: toInt(eventCountsRow?.module_completions),
      workbook_downloads: toInt(eventCountsRow?.workbook_downloads),
      visual_code_saves: toInt(eventCountsRow?.visual_code_saves),
      maya_prompt_packs: toInt(eventCountsRow?.maya_prompt_packs),
      prompt_copies: toInt(eventCountsRow?.prompt_copies),
      final_selects: toInt(eventCountsRow?.final_selects),
      content_plans: toInt(eventCountsRow?.content_plans),
      testimonial_requests: toInt(eventCountsRow?.testimonial_requests),
      testimonial_submissions: toInt(eventCountsRow?.testimonial_submissions),
      recovery_sends: toInt(eventCountsRow?.recovery_sends),
    } satisfies EventCounts,
    payments: {
      purchases: toInt(paymentCountsRow?.purchases),
      revenue_cents: toInt(paymentCountsRow?.revenue_cents),
      first_purchase_at: paymentCountsRow?.first_purchase_at ?? null,
      latest_purchase_at: paymentCountsRow?.latest_purchase_at ?? null,
    } satisfies PaymentCounts,
    emails: {
      delivery_sent: toInt(emailCountsRow?.delivery_sent),
      day1_sent: toInt(emailCountsRow?.day1_sent),
      day3_sent: toInt(emailCountsRow?.day3_sent),
      day5_sent: toInt(emailCountsRow?.day5_sent),
      day7_sent: toInt(emailCountsRow?.day7_sent),
      recovery_sent: toInt(emailCountsRow?.recovery_sent),
    } satisfies EmailCounts,
    moduleRows,
    recentPurchases,
  }
}

export default async function SelfieToBrandShootAdminPage() {
  const windowDays = 30
  const metrics = await getMetrics(windowDays)

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <AdminNav />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 border-b border-stone-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Launch Monitor
            </p>
            <h1 className="font-['Times_New_Roman'] text-4xl font-extralight tracking-normal sm:text-5xl">
              Selfie to Brand Shoot
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              Last {windowDays} days. Watch the warm launch path from sales page to checkout,
              access, course activation, Maya prompt pack usage, and proof capture.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/preview/selfie-to-brand-shoot" className="border border-stone-300 bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-700">
              Preview Course
            </Link>
            <Link href="/selfie-to-brand-shoot" className="border border-stone-950 bg-stone-950 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
              Sales Page
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard label="Landing views" value={metrics.events.landing_views} icon={<Eye className="h-5 w-5" />} />
          <AdminMetricCard label="Checkout starts" value={metrics.events.checkout_starts} icon={<MousePointerClick className="h-5 w-5" />} subtitle={`Start rate ${pct(metrics.events.checkout_starts, metrics.events.landing_views)}`} />
          <AdminMetricCard label="Purchases" value={metrics.payments.purchases} icon={<CheckCircle2 className="h-5 w-5" />} variant="primary" subtitle={`Checkout conversion ${pct(metrics.payments.purchases, metrics.events.checkout_starts)}`} />
          <AdminMetricCard label="Revenue" value={money(metrics.payments.revenue_cents)} icon={<DollarSign className="h-5 w-5" />} />
          <AdminMetricCard label="Access opens" value={metrics.events.access_opens} icon={<BookOpen className="h-5 w-5" />} subtitle={`Buyer activation ${pct(metrics.events.access_opens, metrics.payments.purchases)}`} />
          <AdminMetricCard label="Workbook downloads" value={metrics.events.workbook_downloads} icon={<Download className="h-5 w-5" />} />
          <AdminMetricCard label="Visual codes saved" value={metrics.events.visual_code_saves} icon={<ClipboardList className="h-5 w-5" />} />
          <AdminMetricCard label="Maya prompt packs" value={metrics.events.maya_prompt_packs} icon={<Sparkles className="h-5 w-5" />} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="border border-stone-200 bg-white p-5">
            <h2 className="mb-4 font-['Times_New_Roman'] text-3xl font-extralight">
              Course Activation
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminMetricCard label="Module starts" value={metrics.events.module_starts} variant="compact" />
              <AdminMetricCard label="Module completions" value={metrics.events.module_completions} variant="compact" />
              <AdminMetricCard label="Prompt copies" value={metrics.events.prompt_copies} variant="compact" />
              <AdminMetricCard label="Final selects completed" value={metrics.events.final_selects} variant="compact" />
              <AdminMetricCard label="Content plans completed" value={metrics.events.content_plans} variant="compact" />
              <AdminMetricCard label="Recovery sends" value={metrics.events.recovery_sends} variant="compact" />
            </div>
          </section>

          <section className="border border-stone-200 bg-white p-5">
            <h2 className="mb-4 font-['Times_New_Roman'] text-3xl font-extralight">
              Buyer Emails
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminMetricCard label="Delivery sent" value={metrics.emails.delivery_sent} icon={<Mail className="h-4 w-4" />} variant="compact" />
              <AdminMetricCard label="Day 1 sent" value={metrics.emails.day1_sent} variant="compact" />
              <AdminMetricCard label="Day 3 sent" value={metrics.emails.day3_sent} variant="compact" />
              <AdminMetricCard label="Day 5 sent" value={metrics.emails.day5_sent} variant="compact" />
              <AdminMetricCard label="Day 7 proof sent" value={metrics.emails.day7_sent} variant="compact" />
              <AdminMetricCard label="Recovery sent" value={metrics.emails.recovery_sent} variant="compact" />
            </div>
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="border border-stone-200 bg-white p-5">
            <h2 className="mb-4 font-['Times_New_Roman'] text-3xl font-extralight">
              Module Starts / Completions
            </h2>
            <div className="space-y-3">
              {metrics.moduleRows.length > 0 ? (
                metrics.moduleRows.map(row => (
                  <div key={row.module || "unknown"} className="flex items-center justify-between border-b border-stone-100 pb-3 text-sm">
                    <span>Module {row.module || "unknown"}</span>
                    <span className="text-stone-500">
                      {row.starts} starts · {row.completions} completions
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-stone-500">No module events yet.</p>
              )}
            </div>
          </section>

          <section className="border border-stone-200 bg-white p-5">
            <h2 className="mb-4 font-['Times_New_Roman'] text-3xl font-extralight">
              Recent Purchases
            </h2>
            <div className="space-y-3">
              {metrics.recentPurchases.length > 0 ? (
                metrics.recentPurchases.map(row => (
                  <div key={row.stripe_payment_id || row.payment_date} className="flex items-center justify-between border-b border-stone-100 pb-3 text-sm">
                    <span>{new Date(row.payment_date).toLocaleString("en-GB")}</span>
                    <span className="text-stone-500">{money(row.amount_cents)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-stone-500">No purchases in this window yet.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
