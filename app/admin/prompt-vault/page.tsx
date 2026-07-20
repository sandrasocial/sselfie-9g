import Link from "next/link"
import {
  BarChart3,
  Copy,
  DollarSign,
  Eye,
  Mail,
  MousePointerClick,
  ShoppingCart,
  Users,
} from "lucide-react"
import { AdminNav } from "@/components/admin/admin-nav"
import { AdminMetricCard } from "@/components/admin/shared"
import { sql } from "@/lib/db/client"
import { ensureAnalyticsSchema } from "@/lib/analytics/schema"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"

export const dynamic = "force-dynamic"

type EventCounts = {
  landing_views: number
  reel_clicks: number
  free_to_vault_clicks: number
  checkout_session_requested: number
  checkout_session_created: number
  checkout_session_failed: number
  checkout_starts: number
  payment_form_rendered: number
  recovery_sends: number
  payment_completed: number
  checkout_successes: number
  access_opens: number
  prompt_views: number
  prompt_copies: number
}

type PaymentCounts = {
  purchases: number
  revenue_cents: number
  first_purchase_at: string | null
  latest_purchase_at: string | null
}

type BuyerCounts = {
  buyers: number
  delivery_sent: number
  day2_sent: number
  day5_sent: number
  day10_sent: number
}

type TopPromptRow = {
  prompt_title: string | null
  prompt_number: string | null
  views?: number
  copies?: number
}

type AttributionRow = {
  source: string | null
  utm_source: string | null
  utm_campaign: string | null
  entry_post_slug: string | null
  cta_keyword: string | null
  prompt_number: string | null
  checkout_starts: number
  purchases: number
  recovery_sends: number
}

type PromptFunnelRow = {
  prompt_number: string | null
  prompt_title: string | null
  cta_keyword: string | null
  entry_post_slug: string | null
  page_views: number
  prompt_copies: number
  email_captures: number
  checkout_starts: number
  purchases: number
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

async function getPromptVaultMetrics(windowDays: number) {
  await ensureAnalyticsSchema()
  await ensureRevenueEngineSchema()

  const [eventCountsRow] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_landing_view')::int AS landing_views,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_reel_click')::int AS reel_clicks,
      COUNT(*) FILTER (WHERE event_name IN ('ai_prompts_prompt_vault_click', 'ai_prompts_locked_vault_tile_click'))::int AS free_to_vault_clicks,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_checkout_session_requested')::int AS checkout_session_requested,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_checkout_session_created')::int AS checkout_session_created,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_checkout_session_failed')::int AS checkout_session_failed,
      COUNT(*) FILTER (
        WHERE event_name = 'checkout_start'
          AND properties->>'product_type' = 'prompt_vault'
      )::int AS checkout_starts,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_payment_form_rendered')::int AS payment_form_rendered,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_checkout_recovery_sent')::int AS recovery_sends,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_payment_completed')::int AS payment_completed,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_checkout_success')::int AS checkout_successes,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_access_opened')::int AS access_opens,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_prompt_viewed')::int AS prompt_views,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_prompt_copied')::int AS prompt_copies
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
      AND (product_type = 'prompt_vault' OR payment_type = 'prompt_vault')
  `

  const [buyerCountsRow] = await sql`
    SELECT
      COUNT(DISTINCT fs.email)::int AS buyers,
      COUNT(DISTINCT fs.email) FILTER (WHERE fs.guide_access_email_sent = TRUE)::int AS delivery_sent
    FROM freebie_subscribers fs
    WHERE COALESCE(fs.converted_at, fs.updated_at, fs.created_at) > NOW() - (${`${windowDays} days`}::interval)
      AND fs.email IS NOT NULL
      AND fs.email <> ''
      AND (
        fs.source = 'prompt-vault-paid'
        OR 'prompt-vault-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
      )
  `

  const [buyerEmailCountsRow] = await sql`
    SELECT
      COUNT(DISTINCT user_email) FILTER (WHERE email_type = 'prompt-vault-day2-first-result')::int AS day2_sent,
      COUNT(DISTINCT user_email) FILTER (WHERE email_type = 'prompt-vault-day5-fix-bad-result')::int AS day5_sent,
      COUNT(DISTINCT user_email) FILTER (WHERE email_type = 'prompt-vault-day10-next-shoot')::int AS day10_sent
    FROM email_logs
    WHERE sent_at > NOW() - (${`${windowDays} days`}::interval)
      AND status IN ('sent', 'delivered', 'suppressed')
  `

  const topPrompts = (await sql`
    SELECT
      NULLIF(properties->>'prompt_title', '') AS prompt_title,
      NULLIF(properties->>'prompt_number', '') AS prompt_number,
      COUNT(*)::int AS copies
    FROM analytics_events
    WHERE created_at > NOW() - (${`${windowDays} days`}::interval)
      AND event_name = 'prompt_vault_prompt_copied'
    GROUP BY 1, 2
    ORDER BY copies DESC, prompt_number ASC
    LIMIT 10
  `) as TopPromptRow[]

  const topViewedPrompts = (await sql`
    SELECT
      NULLIF(properties->>'prompt_title', '') AS prompt_title,
      NULLIF(properties->>'prompt_number', '') AS prompt_number,
      COUNT(*)::int AS views
    FROM analytics_events
    WHERE created_at > NOW() - (${`${windowDays} days`}::interval)
      AND event_name = 'prompt_vault_prompt_viewed'
    GROUP BY 1, 2
    ORDER BY views DESC, prompt_number ASC
    LIMIT 10
  `) as TopPromptRow[]

  const attributionRows = (await sql`
    SELECT
      NULLIF(source, '') AS source,
      NULLIF(utm_source, '') AS utm_source,
      NULLIF(utm_campaign, '') AS utm_campaign,
      NULLIF(entry_post_slug, '') AS entry_post_slug,
      NULLIF(cta_keyword, '') AS cta_keyword,
      NULLIF(prompt_number, '') AS prompt_number,
      COUNT(*)::int AS checkout_starts,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS purchases,
      COUNT(*) FILTER (WHERE recovery_email_sent_at IS NOT NULL)::int AS recovery_sends
    FROM checkout_attribution
    WHERE created_at > NOW() - (${`${windowDays} days`}::interval)
      AND product_type = 'prompt_vault'
    GROUP BY 1, 2, 3, 4, 5, 6
    ORDER BY checkout_starts DESC, purchases DESC
    LIMIT 10
  `) as AttributionRow[]

  const promptFunnelRows = (await sql`
    WITH prompt_events AS (
      SELECT
        NULLIF(properties->>'prompt_number', '') AS prompt_number,
        NULLIF(properties->>'prompt_title', '') AS prompt_title,
        NULLIF(properties->>'cta_keyword', '') AS cta_keyword,
        NULLIF(properties->>'entry_post_slug', '') AS entry_post_slug,
        COUNT(*) FILTER (
          WHERE event_name = 'prompt_vault_prompt_viewed'
            AND properties->>'source' = 'single-prompt-page'
        )::int AS page_views,
        COUNT(*) FILTER (
          WHERE event_name = 'ai_prompts_prompt_copied'
            AND properties->>'source' = 'single-prompt-page'
        )::int AS prompt_copies,
        COUNT(*) FILTER (
          WHERE event_name = 'ai_prompts_subscribed'
            AND properties->>'delivery_context' = 'single_prompt'
        )::int AS email_captures,
        0::int AS checkout_starts,
        0::int AS purchases
      FROM analytics_events
      WHERE created_at > NOW() - (${`${windowDays} days`}::interval)
        AND event_name IN (
          'prompt_vault_prompt_viewed',
          'ai_prompts_prompt_copied',
          'ai_prompts_subscribed'
        )
      GROUP BY 1, 2, 3, 4
    ),
    checkout_rows AS (
      SELECT
        NULLIF(prompt_number, '') AS prompt_number,
        NULL::text AS prompt_title,
        NULLIF(cta_keyword, '') AS cta_keyword,
        NULLIF(entry_post_slug, '') AS entry_post_slug,
        0::int AS page_views,
        0::int AS prompt_copies,
        0::int AS email_captures,
        COUNT(*)::int AS checkout_starts,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS purchases
      FROM checkout_attribution
      WHERE created_at > NOW() - (${`${windowDays} days`}::interval)
        AND product_type = 'prompt_vault'
        AND (
          NULLIF(prompt_number, '') IS NOT NULL
          OR NULLIF(cta_keyword, '') IS NOT NULL
          OR NULLIF(entry_post_slug, '') IS NOT NULL
        )
      GROUP BY 1, 2, 3, 4
    )
    SELECT
      prompt_number,
      MAX(prompt_title) AS prompt_title,
      cta_keyword,
      entry_post_slug,
      SUM(page_views)::int AS page_views,
      SUM(prompt_copies)::int AS prompt_copies,
      SUM(email_captures)::int AS email_captures,
      SUM(checkout_starts)::int AS checkout_starts,
      SUM(purchases)::int AS purchases
    FROM (
      SELECT * FROM prompt_events
      UNION ALL
      SELECT * FROM checkout_rows
    ) rows
    GROUP BY 1, 3, 4
    HAVING
      SUM(page_views) > 0
      OR SUM(prompt_copies) > 0
      OR SUM(email_captures) > 0
      OR SUM(checkout_starts) > 0
      OR SUM(purchases) > 0
    ORDER BY email_captures DESC, checkout_starts DESC, page_views DESC, prompt_copies DESC
    LIMIT 12
  `) as PromptFunnelRow[]

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
      AND (product_type = 'prompt_vault' OR payment_type = 'prompt_vault')
    ORDER BY payment_date DESC
    LIMIT 10
  `) as RecentPurchaseRow[]

  const eventCounts: EventCounts = {
    landing_views: toInt(eventCountsRow?.landing_views),
    reel_clicks: toInt(eventCountsRow?.reel_clicks),
    free_to_vault_clicks: toInt(eventCountsRow?.free_to_vault_clicks),
    checkout_session_requested: toInt(eventCountsRow?.checkout_session_requested),
    checkout_session_created: toInt(eventCountsRow?.checkout_session_created),
    checkout_session_failed: toInt(eventCountsRow?.checkout_session_failed),
    checkout_starts: toInt(eventCountsRow?.checkout_starts),
    payment_form_rendered: toInt(eventCountsRow?.payment_form_rendered),
    recovery_sends: toInt(eventCountsRow?.recovery_sends),
    payment_completed: toInt(eventCountsRow?.payment_completed),
    checkout_successes: toInt(eventCountsRow?.checkout_successes),
    access_opens: toInt(eventCountsRow?.access_opens),
    prompt_views: toInt(eventCountsRow?.prompt_views),
    prompt_copies: toInt(eventCountsRow?.prompt_copies),
  }

  const paymentCounts: PaymentCounts = {
    purchases: toInt(paymentCountsRow?.purchases),
    revenue_cents: toInt(paymentCountsRow?.revenue_cents),
    first_purchase_at: paymentCountsRow?.first_purchase_at ?? null,
    latest_purchase_at: paymentCountsRow?.latest_purchase_at ?? null,
  }

  const buyerCounts: BuyerCounts = {
    buyers: toInt(buyerCountsRow?.buyers),
    delivery_sent: toInt(buyerCountsRow?.delivery_sent),
    day2_sent: toInt(buyerEmailCountsRow?.day2_sent),
    day5_sent: toInt(buyerEmailCountsRow?.day5_sent),
    day10_sent: toInt(buyerEmailCountsRow?.day10_sent),
  }

  return {
    eventCounts,
    paymentCounts,
    buyerCounts,
    topPrompts,
    topViewedPrompts,
    attributionRows,
    promptFunnelRows,
    recentPurchases,
  }
}

export default async function PromptVaultAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const params = await searchParams
  const requestedDays = Number(params.days || 14)
  const windowDays = [7, 14, 30].includes(requestedDays) ? requestedDays : 14
  const {
    eventCounts,
    paymentCounts,
    buyerCounts,
    topPrompts,
    topViewedPrompts,
    attributionRows,
    promptFunnelRows,
    recentPurchases,
  } = await getPromptVaultMetrics(windowDays)

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3">
              Launch Monitor
            </p>
            <h1 className="font-['Times_New_Roman'] text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-3">
              PROMPT VAULT
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 tracking-[0.1em] uppercase">
              Traffic, checkout, purchases, access, and prompt usage.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[7, 14, 30].map(days => (
              <Link
                key={days}
                href={`/admin/prompt-vault?days=${days}`}
                className={`px-4 py-2 border text-[10px] tracking-[0.18em] uppercase transition-colors ${
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <AdminMetricCard
            label="Vault Visits"
            value={eventCounts.landing_views}
            icon={<BarChart3 className="w-5 h-5" />}
            subtitle={`${eventCounts.reel_clicks} reel clicks · ${eventCounts.free_to_vault_clicks} free prompt clicks`}
          />
          <AdminMetricCard
            label="Checkout Starts"
            value={eventCounts.checkout_starts}
            icon={<ShoppingCart className="w-5 h-5" />}
            subtitle={`${pct(eventCounts.checkout_starts, eventCounts.landing_views)} from visits`}
          />
          <AdminMetricCard
            label="Purchases"
            value={paymentCounts.purchases}
            icon={<DollarSign className="w-5 h-5" />}
            subtitle={`${pct(paymentCounts.purchases, eventCounts.checkout_starts)} from checkout`}
          />
          <AdminMetricCard
            label="Vault Revenue"
            value={money(paymentCounts.revenue_cents)}
            icon={<DollarSign className="w-5 h-5" />}
            subtitle={
              paymentCounts.latest_purchase_at
                ? `Latest: ${new Date(paymentCounts.latest_purchase_at).toLocaleDateString()}`
                : "No purchases yet"
            }
          />
          <AdminMetricCard
            label="Buyer Records"
            value={buyerCounts.buyers}
            icon={<Users className="w-5 h-5" />}
            subtitle={`${buyerCounts.delivery_sent} delivery emails marked sent`}
          />
          <AdminMetricCard
            label="Recovery Sends"
            value={eventCounts.recovery_sends}
            icon={<Mail className="w-5 h-5" />}
            subtitle="Abandoned checkout follow-up"
          />
          <AdminMetricCard
            label="Access Opens"
            value={eventCounts.access_opens}
            icon={<MousePointerClick className="w-5 h-5" />}
            subtitle={`${pct(eventCounts.access_opens, buyerCounts.buyers)} of buyer records`}
          />
          <AdminMetricCard
            label="Prompt Views"
            value={eventCounts.prompt_views}
            icon={<Eye className="w-5 h-5" />}
            subtitle="Post-purchase demand signal"
          />
          <AdminMetricCard
            label="Prompt Copies"
            value={eventCounts.prompt_copies}
            icon={<Copy className="w-5 h-5" />}
            subtitle={`${eventCounts.prompt_copies && paymentCounts.purchases ? (eventCounts.prompt_copies / paymentCounts.purchases).toFixed(1) : "0"} per purchase`}
          />
          <AdminMetricCard
            label="Buyer Emails"
            value={buyerCounts.day2_sent + buyerCounts.day5_sent + buyerCounts.day10_sent}
            icon={<Mail className="w-5 h-5" />}
            subtitle={`D2 ${buyerCounts.day2_sent} · D5 ${buyerCounts.day5_sent} · D10 ${buyerCounts.day10_sent}`}
          />
        </div>

        <section className="mb-8 border border-stone-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-stone-400">
                Checkout Diagnostic
              </p>
              <h2 className="font-['Times_New_Roman'] text-xl font-extralight uppercase tracking-[0.18em] text-stone-950 sm:text-2xl">
                Session to Payment Form
              </h2>
            </div>
            <p className="max-w-xl text-xs leading-relaxed text-stone-500">
              This shows whether buyers are dropping before Stripe loads, inside the payment form,
              or after payment.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              {
                label: "Requested",
                value: eventCounts.checkout_session_requested,
                detail: "Checkout route opened",
              },
              {
                label: "Created",
                value: eventCounts.checkout_session_created,
                detail: `${pct(eventCounts.checkout_session_created, eventCounts.checkout_session_requested)} of requests`,
              },
              {
                label: "Failed",
                value: eventCounts.checkout_session_failed,
                detail: "Session creation errors",
              },
              {
                label: "Form Rendered",
                value: eventCounts.payment_form_rendered,
                detail: `${pct(eventCounts.payment_form_rendered, eventCounts.checkout_session_created)} of sessions`,
              },
              {
                label: "Completed",
                value: eventCounts.payment_completed || eventCounts.checkout_successes,
                detail: `${pct(eventCounts.payment_completed || eventCounts.checkout_successes, eventCounts.payment_form_rendered || eventCounts.checkout_starts)} of forms`,
              },
            ].map(metric => (
              <div key={metric.label} className="border border-stone-100 bg-stone-50 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  {metric.label}
                </p>
                <p className="mt-3 font-['Times_New_Roman'] text-3xl font-extralight text-stone-950">
                  {metric.value}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-stone-500">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="bg-white border border-stone-200 p-6 rounded-none lg:col-span-2">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-stone-400">
                  ManyChat Funnel
                </p>
                <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
                  PROMPT DEMAND BY LINK
                </h2>
              </div>
              <p className="max-w-xl text-xs leading-relaxed text-stone-500">
                Source: analytics_events for views, copies, and email captures. checkout_attribution
                for starts and purchases. Money still comes from Stripe below.
              </p>
            </div>
            {promptFunnelRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] tracking-[0.18em] uppercase text-stone-400">
                    <tr className="border-b border-stone-100">
                      <th className="py-3 pr-4 font-medium">Prompt</th>
                      <th className="py-3 pr-4 font-medium">Keyword</th>
                      <th className="py-3 pr-4 font-medium">Reel</th>
                      <th className="py-3 pr-4 font-medium text-right">Views</th>
                      <th className="py-3 pr-4 font-medium text-right">Emails</th>
                      <th className="py-3 pr-4 font-medium text-right">Copies</th>
                      <th className="py-3 pr-4 font-medium text-right">Starts</th>
                      <th className="py-3 font-medium text-right">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {promptFunnelRows.map(row => (
                      <tr key={`${row.prompt_number}-${row.cta_keyword}-${row.entry_post_slug}`}>
                        <td className="py-3 pr-4 text-stone-950">
                          {row.prompt_number ? `#${row.prompt_number}` : "-"}
                          {row.prompt_title ? (
                            <span className="block max-w-xs truncate text-xs text-stone-500">
                              {row.prompt_title}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4 text-stone-500">{row.cta_keyword || "-"}</td>
                        <td className="py-3 pr-4 text-stone-500">{row.entry_post_slug || "-"}</td>
                        <td className="py-3 pr-4 text-right text-stone-950">{row.page_views}</td>
                        <td className="py-3 pr-4 text-right text-stone-950">
                          {row.email_captures}
                        </td>
                        <td className="py-3 pr-4 text-right text-stone-950">{row.prompt_copies}</td>
                        <td className="py-3 pr-4 text-right text-stone-950">
                          {row.checkout_starts}
                        </td>
                        <td className="py-3 text-right text-stone-950">{row.purchases}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-stone-500 leading-relaxed">
                No single-prompt funnel rows in this window yet. The default PROMPT flow now sends
                traffic to `/ai-prompts`; single-prompt rows only appear from historical
                `/p/[number]` links.
              </p>
            )}
          </section>

          <section className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              TOP VIEWED TRANSFORMATIONS
            </h2>
            {topViewedPrompts.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {topViewedPrompts.map(prompt => (
                  <div
                    key={`${prompt.prompt_number}-${prompt.prompt_title}`}
                    className="py-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm text-stone-950">
                        {prompt.prompt_number ? `${prompt.prompt_number}. ` : ""}
                        {prompt.prompt_title || "Untitled prompt"}
                      </p>
                      <p className="text-[10px] tracking-[0.16em] uppercase text-stone-400 mt-1">
                        Visual demand signal
                      </p>
                    </div>
                    <p className="font-['Times_New_Roman'] text-2xl text-stone-950">
                      {prompt.views}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500 leading-relaxed">
                No paid-vault prompt views in this window yet. Views start tracking after the next
                deploy.
              </p>
            )}
          </section>

          <section className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              TOP COPIED PROMPTS
            </h2>
            {topPrompts.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {topPrompts.map(prompt => (
                  <div
                    key={`${prompt.prompt_number}-${prompt.prompt_title}`}
                    className="py-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm text-stone-950">
                        {prompt.prompt_number ? `${prompt.prompt_number}. ` : ""}
                        {prompt.prompt_title || "Untitled prompt"}
                      </p>
                      <p className="text-[10px] tracking-[0.16em] uppercase text-stone-400 mt-1">
                        Post-purchase usage signal
                      </p>
                    </div>
                    <p className="font-['Times_New_Roman'] text-2xl text-stone-950">
                      {prompt.copies}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500 leading-relaxed">
                No paid-vault prompt copies in this window yet. This is the main product-fit signal
                to watch after launch traffic starts.
              </p>
            )}
          </section>

          <section className="bg-white border border-stone-200 p-6 rounded-none lg:col-span-2">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              REEL + SOURCE ATTRIBUTION
            </h2>
            {attributionRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] tracking-[0.18em] uppercase text-stone-400">
                    <tr className="border-b border-stone-100">
                      <th className="py-3 pr-4 font-medium">Source</th>
                      <th className="py-3 pr-4 font-medium">Campaign</th>
                      <th className="py-3 pr-4 font-medium">Reel</th>
                      <th className="py-3 pr-4 font-medium">Keyword</th>
                      <th className="py-3 pr-4 font-medium">Prompt</th>
                      <th className="py-3 pr-4 font-medium text-right">Starts</th>
                      <th className="py-3 pr-4 font-medium text-right">Sales</th>
                      <th className="py-3 font-medium text-right">Recovery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {attributionRows.map(row => (
                      <tr
                        key={`${row.source}-${row.utm_campaign}-${row.entry_post_slug}-${row.cta_keyword}-${row.prompt_number}`}
                      >
                        <td className="py-3 pr-4 text-stone-950">
                          {row.source || row.utm_source || "direct"}
                        </td>
                        <td className="py-3 pr-4 text-stone-500">{row.utm_campaign || "-"}</td>
                        <td className="py-3 pr-4 text-stone-500">{row.entry_post_slug || "-"}</td>
                        <td className="py-3 pr-4 text-stone-500">{row.cta_keyword || "-"}</td>
                        <td className="py-3 pr-4 text-stone-500">
                          {row.prompt_number ? `#${row.prompt_number}` : "-"}
                        </td>
                        <td className="py-3 pr-4 text-right text-stone-950">
                          {row.checkout_starts}
                        </td>
                        <td className="py-3 pr-4 text-right text-stone-950">{row.purchases}</td>
                        <td className="py-3 text-right text-stone-950">{row.recovery_sends}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-stone-500 leading-relaxed">
                No Prompt Vault checkout attribution rows in this window yet.
              </p>
            )}
          </section>

          <section className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              RECENT PURCHASES
            </h2>
            {recentPurchases.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {recentPurchases.map(purchase => (
                  <div key={purchase.stripe_payment_id || purchase.payment_date} className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-stone-950">{money(purchase.amount_cents)}</p>
                      <p className="text-xs text-stone-500">
                        {new Date(purchase.payment_date).toLocaleString()}
                      </p>
                    </div>
                    <p className="font-mono text-[10px] text-stone-400 mt-1 truncate">
                      {purchase.stripe_payment_id || "No Stripe payment id"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500 leading-relaxed">
                No Prompt Vault purchases recorded in `stripe_payments` for this window.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
