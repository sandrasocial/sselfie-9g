import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { createCronLogger } from "@/lib/cron-logger"
import { neon } from "@neondatabase/serverless"
import { logAdminError } from "@/lib/admin-error-log"

const sql = neon(process.env.DATABASE_URL!)

type ProductType = "sselfie_studio_membership" | "brand_studio_membership" | "pro"

async function hasColumn(table: string, column: string) {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_name = ${table}
      AND column_name = ${column}
  `
  return rows[0]?.count === 1
}

function getProductTypeFromEnvPrice(priceId: string | null | undefined): ProductType | null {
  if (!priceId) return null
  const map: Record<string, ProductType> = {}
  const studio = (process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || "").trim()
  const brand = (process.env.STRIPE_BRAND_STUDIO_MEMBERSHIP_PRICE_ID || "").trim()
  if (studio) map[studio] = "sselfie_studio_membership"
  if (brand) map[brand] = "brand_studio_membership"
  return map[priceId] || null
}

async function deriveProductType(
  sub: Stripe.Subscription,
  opts: { productTypeByProductId: Map<string, ProductType | null> },
): Promise<ProductType | null> {
  const metaType = (sub.metadata as any)?.product_type
  if (metaType === "sselfie_studio_membership" || metaType === "brand_studio_membership" || metaType === "pro") {
    return metaType
  }

  const item0 = sub.items?.data?.[0]
  const priceAny: any = item0?.price
  const priceId = typeof priceAny === "string" ? priceAny : priceAny?.id
  const fromEnv = getProductTypeFromEnvPrice(priceId)
  if (fromEnv) return fromEnv

  const productAny: any = typeof priceAny?.product === "string" ? null : priceAny?.product
  const fromProductMeta = productAny?.metadata?.product_type
  if (fromProductMeta === "sselfie_studio_membership" || fromProductMeta === "brand_studio_membership" || fromProductMeta === "pro") {
    return fromProductMeta
  }

  const productId: string | null = typeof priceAny?.product === "string" ? priceAny.product : null
  if (productId) {
    const cached = opts.productTypeByProductId.get(productId)
    if (cached !== undefined) return cached

    try {
      const product = await stripe.products.retrieve(productId)
      const t = (product.metadata as any)?.product_type
      const resolved: ProductType | null =
        t === "sselfie_studio_membership" || t === "brand_studio_membership" || t === "pro" ? t : null
      opts.productTypeByProductId.set(productId, resolved)
      return resolved
    } catch {
      // If Stripe fetch fails (permissions, deleted product), don't fail the whole job.
      opts.productTypeByProductId.set(productId, null)
      return null
    }
  }

  return null
}

async function resolveUserId(params: { customerId: string | null; email: string | null }) {
  const customerId = (params.customerId || "").trim()
  const email = (params.email || "").trim()

  if (customerId) {
    const rows = await sql`
      SELECT id, stripe_customer_id
      FROM users
      WHERE stripe_customer_id = ${customerId}
      LIMIT 1
    `
    if (rows.length > 0) return { userId: rows[0].id as string, matchedBy: "stripe_customer_id" as const }
  }

  if (email) {
    const rows = await sql`
      SELECT id, stripe_customer_id
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `
    if (rows.length > 0) return { userId: rows[0].id as string, matchedBy: "email" as const }
  }

  return { userId: null as string | null, matchedBy: null as null }
}

async function listSubscriptionsWithFallback(input: {
  pageLimit: number
  maxRecords: number
}): Promise<{ data: Stripe.Subscription[]; listMode: "expanded" | "fallback_no_expand"; truncated: boolean }> {
  const pageLimit = Math.max(1, Math.min(100, input.pageLimit))
  const maxRecords = Math.max(1, Math.min(5000, input.maxRecords))

  let listMode: "expanded" | "fallback_no_expand" = "expanded"
  let rows: Stripe.Subscription[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore && rows.length < maxRecords) {
    try {
      const page = await stripe.subscriptions.list({
        status: "all",
        limit: Math.min(pageLimit, maxRecords - rows.length),
        ...(startingAfter ? { starting_after: startingAfter } : {}),
        ...(listMode === "expanded" ? { expand: ["data.customer"] } : {}),
      })

      rows.push(...(page.data as Stripe.Subscription[]))
      hasMore = page.has_more
      startingAfter = page.data.length > 0 ? page.data[page.data.length - 1].id : undefined
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (listMode === "expanded" && /expand more than 4 levels/i.test(msg)) {
        // Retry end-to-end without expand to avoid Stripe depth failures.
        listMode = "fallback_no_expand"
        rows = []
        hasMore = true
        startingAfter = undefined
        continue
      }
      throw error
    }
  }

  return {
    data: rows,
    listMode,
    truncated: hasMore && rows.length >= maxRecords,
  }
}

async function resolveCustomerEmail(
  customerId: string | null,
  cache: Map<string, string | null>,
): Promise<string | null> {
  const id = String(customerId || "").trim()
  if (!id) return null

  const cached = cache.get(id)
  if (cached !== undefined) return cached

  try {
    const customer = await stripe.customers.retrieve(id)
    const email = !("deleted" in customer) ? customer.email || null : null
    cache.set(id, email)
    return email
  } catch {
    cache.set(id, null)
    return null
  }
}

/**
 * GET /api/cron/reconcile-subscriptions
 *
 * Purpose: backfill/repair DB subscription entitlements from Stripe in case
 * webhook delivery fails or DB writes fail.
 *
 * Safe + idempotent: upserts by stripe_subscription_id; never creates users.
 */
export async function GET(request: NextRequest) {
  const cronLogger = createCronLogger("reconcile-subscriptions")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = (process.env.CRON_SECRET || "").trim()
    if (!cronSecret) {
      await cronLogger.error(new Error("CRON_SECRET not configured"), { reason: "Missing CRON_SECRET" })
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      await cronLogger.error(new Error("STRIPE_SECRET_KEY missing"), { reason: "Missing STRIPE_SECRET_KEY" })
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
    }

    const pageLimit = Math.max(1, Math.min(100, Number(process.env.RECONCILE_SUBSCRIPTIONS_LIMIT || 100)))
    const maxRecords = Math.max(
      pageLimit,
      Math.min(5000, Number(process.env.RECONCILE_SUBSCRIPTIONS_MAX_RECORDS || 500)),
    )

    // Schema guardrails for safety across environments.
    const [hasUsersStripeCustomerId, hasSubsStripeCustomerId, hasSubsIsTestMode] = await Promise.all([
      hasColumn("users", "stripe_customer_id"),
      hasColumn("subscriptions", "stripe_customer_id"),
      hasColumn("subscriptions", "is_test_mode"),
    ])

    if (!hasUsersStripeCustomerId) {
      await cronLogger.error(new Error("users.stripe_customer_id missing"), { reason: "Schema mismatch" })
      return NextResponse.json({ error: "Schema mismatch: users.stripe_customer_id missing" }, { status: 500 })
    }
    if (!hasSubsStripeCustomerId) {
      await cronLogger.error(new Error("subscriptions.stripe_customer_id missing"), { reason: "Schema mismatch" })
      return NextResponse.json({ error: "Schema mismatch: subscriptions.stripe_customer_id missing" }, { status: 500 })
    }

    const { data: subs, listMode, truncated } = await listSubscriptionsWithFallback({ pageLimit, maxRecords })

    let processed = 0
    let upserted = 0
    let skippedNoUser = 0
    let skippedNoProduct = 0
    let userStripeLinked = 0
    let itemFailures = 0
    const productTypeByProductId = new Map<string, ProductType | null>()
    const customerEmailById = new Map<string, string | null>()

    for (const sub of subs) {
      processed += 1
      try {
        const productType = await deriveProductType(sub as any, { productTypeByProductId })
        if (!productType || productType === "pro") {
          skippedNoProduct += 1
          continue
        }

        const customerId =
          typeof sub.customer === "string"
            ? sub.customer
            : (sub.customer as any)?.id || null

        const customerEmail =
          typeof sub.customer === "string"
            ? null
            : ((sub.customer as any)?.email as string | null) || null

        const resolvedCustomerEmail =
          customerEmail || (await resolveCustomerEmail(customerId, customerEmailById))

        const resolved = await resolveUserId({ customerId, email: resolvedCustomerEmail })
        if (!resolved.userId) {
          skippedNoUser += 1
          continue
        }

        // Backfill users.stripe_customer_id if needed.
        if (resolved.matchedBy === "email" && customerId) {
          const userRow = await sql`
            SELECT stripe_customer_id
            FROM users
            WHERE id = ${resolved.userId}
            LIMIT 1
          `
          if (userRow.length > 0 && !userRow[0].stripe_customer_id) {
            await sql`
              UPDATE users
              SET stripe_customer_id = ${customerId}
              WHERE id = ${resolved.userId}
            `
            userStripeLinked += 1
          }
        }

        const stripeStatus = sub.status || "canceled"
        const subAny = sub as any
        const cps = subAny.current_period_start ? new Date(subAny.current_period_start * 1000) : null
        const cpe = subAny.current_period_end ? new Date(subAny.current_period_end * 1000) : null
        const isTestMode = !subAny.livemode

        const existingByStripe = await sql`
          SELECT id
          FROM subscriptions
          WHERE stripe_subscription_id = ${sub.id}
          LIMIT 1
        `

        if (existingByStripe.length > 0) {
          if (hasSubsIsTestMode) {
            const updated = await sql`
              UPDATE subscriptions
              SET
                user_id = ${resolved.userId},
                product_type = ${productType},
                plan = ${productType},
                status = ${stripeStatus},
                stripe_customer_id = ${customerId},
                current_period_start = ${cps},
                current_period_end = ${cpe},
                is_test_mode = ${isTestMode},
                updated_at = NOW()
              WHERE stripe_subscription_id = ${sub.id}
                AND (
                  user_id IS DISTINCT FROM ${resolved.userId}
                  OR product_type IS DISTINCT FROM ${productType}
                  OR plan IS DISTINCT FROM ${productType}
                  OR status IS DISTINCT FROM ${stripeStatus}
                  OR stripe_customer_id IS DISTINCT FROM ${customerId}
                  OR current_period_start IS DISTINCT FROM ${cps}
                  OR current_period_end IS DISTINCT FROM ${cpe}
                  OR is_test_mode IS DISTINCT FROM ${isTestMode}
                )
              RETURNING id
            `
            upserted += updated.length
          } else {
            const updated = await sql`
              UPDATE subscriptions
              SET
                user_id = ${resolved.userId},
                product_type = ${productType},
                plan = ${productType},
                status = ${stripeStatus},
                stripe_customer_id = ${customerId},
                current_period_start = ${cps},
                current_period_end = ${cpe},
                updated_at = NOW()
              WHERE stripe_subscription_id = ${sub.id}
                AND (
                  user_id IS DISTINCT FROM ${resolved.userId}
                  OR product_type IS DISTINCT FROM ${productType}
                  OR plan IS DISTINCT FROM ${productType}
                  OR status IS DISTINCT FROM ${stripeStatus}
                  OR stripe_customer_id IS DISTINCT FROM ${customerId}
                  OR current_period_start IS DISTINCT FROM ${cps}
                  OR current_period_end IS DISTINCT FROM ${cpe}
                )
              RETURNING id
            `
            upserted += updated.length
          }
          continue
        }

        // Attach to a legacy/unlinked membership row only.
        // Never overwrite a different existing stripe_subscription_id, otherwise we can
        // lose track of active Stripe subscriptions for users with multiple subs.
        const existingUnlinkedMembership = await sql`
          SELECT id
          FROM subscriptions
          WHERE user_id = ${resolved.userId}
            AND product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
            AND (stripe_subscription_id IS NULL OR BTRIM(stripe_subscription_id) = '')
          ORDER BY created_at DESC
          LIMIT 1
        `

        if (existingUnlinkedMembership.length > 0) {
          if (hasSubsIsTestMode) {
            const updated = await sql`
              UPDATE subscriptions
              SET
                product_type = ${productType},
                plan = ${productType},
                status = ${stripeStatus},
                stripe_subscription_id = ${sub.id},
                stripe_customer_id = ${customerId},
                current_period_start = ${cps},
                current_period_end = ${cpe},
                is_test_mode = ${isTestMode},
                updated_at = NOW()
              WHERE id = ${existingUnlinkedMembership[0].id}
                AND (
                  product_type IS DISTINCT FROM ${productType}
                  OR plan IS DISTINCT FROM ${productType}
                  OR status IS DISTINCT FROM ${stripeStatus}
                  OR stripe_subscription_id IS DISTINCT FROM ${sub.id}
                  OR stripe_customer_id IS DISTINCT FROM ${customerId}
                  OR current_period_start IS DISTINCT FROM ${cps}
                  OR current_period_end IS DISTINCT FROM ${cpe}
                  OR is_test_mode IS DISTINCT FROM ${isTestMode}
                )
              RETURNING id
            `
            upserted += updated.length
          } else {
            const updated = await sql`
              UPDATE subscriptions
              SET
                product_type = ${productType},
                plan = ${productType},
                status = ${stripeStatus},
                stripe_subscription_id = ${sub.id},
                stripe_customer_id = ${customerId},
                current_period_start = ${cps},
                current_period_end = ${cpe},
                updated_at = NOW()
              WHERE id = ${existingUnlinkedMembership[0].id}
                AND (
                  product_type IS DISTINCT FROM ${productType}
                  OR plan IS DISTINCT FROM ${productType}
                  OR status IS DISTINCT FROM ${stripeStatus}
                  OR stripe_subscription_id IS DISTINCT FROM ${sub.id}
                  OR stripe_customer_id IS DISTINCT FROM ${customerId}
                  OR current_period_start IS DISTINCT FROM ${cps}
                  OR current_period_end IS DISTINCT FROM ${cpe}
                )
              RETURNING id
            `
            upserted += updated.length
          }
          continue
        }

        // Create a new membership row (last resort).
        if (hasSubsIsTestMode) {
          await sql`
            INSERT INTO subscriptions (
              user_id,
              product_type,
              plan,
              status,
              stripe_subscription_id,
              stripe_customer_id,
              current_period_start,
              current_period_end,
              is_test_mode,
              created_at,
              updated_at
            )
            VALUES (
              ${resolved.userId},
              ${productType},
              ${productType},
              ${stripeStatus},
              ${sub.id},
              ${customerId},
              ${cps},
              ${cpe},
              ${isTestMode},
              NOW(),
              NOW()
            )
          `
        } else {
          await sql`
            INSERT INTO subscriptions (
              user_id,
              product_type,
              plan,
              status,
              stripe_subscription_id,
              stripe_customer_id,
              current_period_start,
              current_period_end,
              created_at,
              updated_at
            )
            VALUES (
              ${resolved.userId},
              ${productType},
              ${productType},
              ${stripeStatus},
              ${sub.id},
              ${customerId},
              ${cps},
              ${cpe},
              NOW(),
              NOW()
            )
          `
        }
        upserted += 1
      } catch (subErr) {
        itemFailures += 1
        await logAdminError({
          toolName: "cron:reconcile-subscriptions:item",
          error: subErr instanceof Error ? subErr : new Error(String(subErr)),
          context: {
            stripeSubscriptionId: sub.id,
            stripeStatus: sub.status,
          },
        }).catch(() => {})
      }
    }

    if (truncated) {
      await logAdminError({
        toolName: "cron:reconcile-subscriptions:truncated",
        error: new Error("Stripe subscription list truncated by maxRecords"),
        context: { pageLimit, maxRecords, processed },
      }).catch(() => {})
    }

    const summary = {
      pageLimit,
      maxRecords,
      listMode,
      truncated,
      processed,
      upserted,
      skippedNoUser,
      skippedNoProduct,
      userStripeLinked,
      itemFailures,
      status: "ok",
    }
    await cronLogger.success(summary)
    return NextResponse.json({ success: true, ...summary })
  } catch (err) {
    await cronLogger.error(err, { status: "failed" })
    return NextResponse.json({ error: "Cron failure" }, { status: 500 })
  }
}
