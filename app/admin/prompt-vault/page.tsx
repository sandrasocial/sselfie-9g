import Link from "next/link"
import { BarChart3, Copy, DollarSign, Mail, MousePointerClick, ShoppingCart, Users } from "lucide-react"
import { AdminNav } from "@/components/admin/admin-nav"
import { AdminMetricCard } from "@/components/admin/shared"
import { sql } from "@/lib/db/client"
import { ensureAnalyticsSchema } from "@/lib/analytics/schema"

export const dynamic = "force-dynamic"

type EventCounts = {
  landing_views: number
  free_to_vault_clicks: number
  checkout_starts: number
  checkout_successes: number
  access_opens: number
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
  copies: number
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

  const [eventCountsRow] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_landing_view')::int AS landing_views,
      COUNT(*) FILTER (WHERE event_name = 'ai_prompts_prompt_vault_click')::int AS free_to_vault_clicks,
      COUNT(*) FILTER (
        WHERE event_name = 'checkout_start'
          AND properties->>'product_type' = 'prompt_vault'
      )::int AS checkout_starts,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_checkout_success')::int AS checkout_successes,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_access_opened')::int AS access_opens,
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
    free_to_vault_clicks: toInt(eventCountsRow?.free_to_vault_clicks),
    checkout_starts: toInt(eventCountsRow?.checkout_starts),
    checkout_successes: toInt(eventCountsRow?.checkout_successes),
    access_opens: toInt(eventCountsRow?.access_opens),
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

  return { eventCounts, paymentCounts, buyerCounts, topPrompts, recentPurchases }
}

export default async function PromptVaultAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const params = await searchParams
  const requestedDays = Number(params.days || 14)
  const windowDays = [7, 14, 30].includes(requestedDays) ? requestedDays : 14
  const { eventCounts, paymentCounts, buyerCounts, topPrompts, recentPurchases } =
    await getPromptVaultMetrics(windowDays)

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
            {[7, 14, 30].map((days) => (
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
            subtitle={`${eventCounts.free_to_vault_clicks} clicks from free prompts`}
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
            subtitle={paymentCounts.latest_purchase_at ? `Latest: ${new Date(paymentCounts.latest_purchase_at).toLocaleDateString()}` : "No purchases yet"}
          />
          <AdminMetricCard
            label="Buyer Records"
            value={buyerCounts.buyers}
            icon={<Users className="w-5 h-5" />}
            subtitle={`${buyerCounts.delivery_sent} delivery emails marked sent`}
          />
          <AdminMetricCard
            label="Access Opens"
            value={eventCounts.access_opens}
            icon={<MousePointerClick className="w-5 h-5" />}
            subtitle={`${pct(eventCounts.access_opens, buyerCounts.buyers)} of buyer records`}
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

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              TOP COPIED PROMPTS
            </h2>
            {topPrompts.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {topPrompts.map((prompt) => (
                  <div key={`${prompt.prompt_number}-${prompt.prompt_title}`} className="py-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-stone-950">
                        {prompt.prompt_number ? `${prompt.prompt_number}. ` : ""}
                        {prompt.prompt_title || "Untitled prompt"}
                      </p>
                      <p className="text-[10px] tracking-[0.16em] uppercase text-stone-400 mt-1">
                        Post-purchase usage signal
                      </p>
                    </div>
                    <p className="font-['Times_New_Roman'] text-2xl text-stone-950">{prompt.copies}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500 leading-relaxed">
                No paid-vault prompt copies in this window yet. This is the main product-fit signal to watch after launch traffic starts.
              </p>
            )}
          </section>

          <section className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              RECENT PURCHASES
            </h2>
            {recentPurchases.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {recentPurchases.map((purchase) => (
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
