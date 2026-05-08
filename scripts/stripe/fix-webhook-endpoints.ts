/**
 * Fixes misconfigured Stripe webhook URLs (e.g. site root instead of /api/webhooks/stripe).
 * Run: pnpm exec tsx scripts/stripe/fix-webhook-endpoints.ts
 *
 * Loads .env.local for STRIPE_SECRET_KEY (must be live key sk_live_... for production webhooks).
 */
import * as dotenv from "dotenv"
import { resolve } from "path"
import Stripe from "stripe"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })
dotenv.config()

const CORRECT_PATH = "/api/webhooks/stripe"
const PRODUCTION_HOSTS = new Set(["sselfie.ai", "www.sselfie.ai"])

const ENABLED_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
]

function isRootSiteUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!PRODUCTION_HOSTS.has(u.hostname)) return false
    return u.pathname === "/" || u.pathname === ""
  } catch {
    return false
  }
}

function isCorrectWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!PRODUCTION_HOSTS.has(u.hostname)) return false
    const path = u.pathname.endsWith("/") && u.pathname.length > 1 ? u.pathname.slice(0, -1) : u.pathname
    return path === CORRECT_PATH
  } catch {
    return false
  }
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.error("STRIPE_SECRET_KEY is not set (check .env.local)")
    process.exit(1)
  }
  if (!key.startsWith("sk_live_")) {
    console.warn(
      "Warning: STRIPE_SECRET_KEY is not sk_live_ — listing/updating test-mode webhooks only."
    )
  }

  const stripe = new Stripe(key, { apiVersion: "2026-01-28.clover" })
  const { data: endpoints } = await stripe.webhookEndpoints.list({ limit: 100 })

  console.log("Current webhook endpoints:")
  for (const e of endpoints) {
    console.log(`  - ${e.id} ${e.url} (${e.status})`)
  }

  const bad = endpoints.filter((e) => isRootSiteUrl(e.url))
  const good = endpoints.find((e) => isCorrectWebhookUrl(e.url))

  for (const e of bad) {
    console.log(`\nDeleting misconfigured endpoint: ${e.id} → ${e.url}`)
    await stripe.webhookEndpoints.del(e.id)
    console.log("  Deleted.")
  }

  if (good) {
    console.log(`\nCorrect endpoint already exists: ${good.id} → ${good.url}`)
    console.log("No new signing secret required.")
    return
  }

  if (bad.length === 0 && !good) {
    console.log("\nNo root-URL endpoint found and no /api/webhooks/stripe endpoint — creating one.")
  } else if (!good) {
    console.log("\nCreating missing endpoint https://sselfie.ai/api/webhooks/stripe …")
  }

  const created = await stripe.webhookEndpoints.create({
    url: "https://sselfie.ai/api/webhooks/stripe",
    enabled_events: ENABLED_EVENTS,
    description: "SSELFIE production — app handler (codex fix)",
  })

  console.log("\nCreated webhook endpoint:", created.id, created.url)
  console.log(
    "\nIMPORTANT: Set STRIPE_WEBHOOK_SECRET in Vercel (Production) to the new signing secret from Stripe Dashboard,"
  )
  console.log("or run: stripe listen ... is only for dev. Production secret is shown once in Dashboard → Webhooks → endpoint → Signing secret.")
  console.log("\nSigning secret (add to Vercel STRIPE_WEBHOOK_SECRET):")
  console.log(created.secret)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
