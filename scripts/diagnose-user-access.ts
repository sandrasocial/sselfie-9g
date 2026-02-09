#!/usr/bin/env tsx
/**
 * Diagnose a user's subscription and access (e.g. after upgrade not reflecting).
 * Optionally fix subscription product_type by syncing from Stripe.
 *
 * Usage:
 *   pnpm tsx scripts/diagnose-user-access.ts "Laurie Gracia"
 *   pnpm tsx scripts/diagnose-user-access.ts "laurie@example.com"
 *   pnpm tsx scripts/diagnose-user-access.ts "Laurie Gracia" --fix
 */

import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

import { neon } from "@neondatabase/serverless"
import Stripe from "stripe"

const sql = neon(process.env.DATABASE_URL!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" })

const MEMBERSHIP_PRICE_IDS: Record<string, string> = {
  [process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || ""]: "sselfie_studio_membership",
  [process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID || ""]: "one_time_session",
  [process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID || ""]: "paid_blueprint",
  [process.env.STRIPE_BRAND_STUDIO_MEMBERSHIP_PRICE_ID || ""]: "brand_studio_membership",
}

function productTypeFromPriceId(priceId: string): string {
  return MEMBERSHIP_PRICE_IDS[priceId] || "unknown"
}

async function main() {
  const query = process.argv[2]
  const doFix = process.argv.includes("--fix")

  if (!query || query.trim().length < 2) {
    console.error("Usage: pnpm tsx scripts/diagnose-user-access.ts \"<name or email>\" [--fix]")
    process.exit(1)
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set")
    process.exit(1)
  }

  const searchPattern = `%${query.trim()}%`
  const users = await sql`
    SELECT id, email, display_name, supabase_user_id, stack_auth_id, created_at
    FROM users
    WHERE email ILIKE ${searchPattern} OR display_name ILIKE ${searchPattern}
    ORDER BY created_at DESC
    LIMIT 10
  `

  if (users.length === 0) {
    console.log("No users found for:", query)
    process.exit(0)
  }

  console.log("Found", users.length, "user(s):\n")

  for (const u of users) {
    console.log("---")
    console.log("User id:", u.id)
    console.log("Email:", u.email)
    console.log("Display name:", u.display_name)
    console.log("Supabase auth id:", (u as any).supabase_user_id || "(not set)")
    console.log("Stack auth id:", (u as any).stack_auth_id || "(not set)")
    console.log("Created:", u.created_at)

    const subs = await sql`
      SELECT id, product_type, plan, status, stripe_subscription_id, stripe_customer_id,
             current_period_start, current_period_end, is_test_mode, created_at, updated_at
      FROM subscriptions
      WHERE user_id = ${u.id}
      ORDER BY created_at DESC
    `
    console.log("\nSubscriptions (" + subs.length + "):")
    if (subs.length === 0) {
      console.log("  (none)")
    } else {
      subs.forEach((s: any, i: number) => {
        console.log(`  [${i + 1}] product_type=${s.product_type} status=${s.status} stripe_sub=${s.stripe_subscription_id || "—"} period_end=${s.current_period_end}`)
      })
    }

    const blueprint = await sql`
      SELECT user_id, paid_blueprint_purchased, free_grid_used_count, paid_grids_generated
      FROM blueprint_subscribers
      WHERE user_id = ${u.id}
      LIMIT 1
    `
    console.log("\nBlueprint subscriber:", blueprint.length ? blueprint[0] : "(no row)")

    const activeSub = subs.find((s: any) => s.status === "active" || s.status === "trialing")
    const membershipTypes = ["sselfie_studio_membership", "brand_studio_membership", "pro", "one_time_session"]
    const wouldHaveAccess = activeSub && membershipTypes.includes(activeSub.product_type)

    console.log("\nAccess check:")
    console.log("  Active subscription:", activeSub ? `${activeSub.product_type} (${activeSub.status})` : "none")
    console.log("  Would get membership access:", wouldHaveAccess ? "YES" : "NO")

    if (doFix && activeSub?.stripe_subscription_id) {
      const needsProductFix = !wouldHaveAccess
      const needsPeriodFix = activeSub.current_period_end == null || activeSub.current_period_start == null
      if (!needsProductFix && !needsPeriodFix) {
        console.log("\n[--fix] Subscription already correct; nothing to fix.")
      } else {
        console.log("\n[--fix] Syncing from Stripe for subscription", activeSub.stripe_subscription_id)
      try {
        const stripeSub = await stripe.subscriptions.retrieve(activeSub.stripe_subscription_id, { expand: ["items.data.price"] })
        const priceId = (stripeSub.items.data[0] as any)?.price?.id
        const metadataType = (stripeSub.metadata as any)?.product_type
        const productType = metadataType || (priceId ? productTypeFromPriceId(priceId) : null)
        const periodStart = stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000) : null
        const periodEnd = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null

        const updates: string[] = []
        if (needsProductFix && productType && productType !== "unknown") {
          await sql`
            UPDATE subscriptions
            SET product_type = ${productType}, plan = ${productType}, updated_at = NOW()
            WHERE stripe_subscription_id = ${activeSub.stripe_subscription_id}
          `
          updates.push("product_type -> " + productType)
        } else if (needsProductFix) {
          console.log("  Could not derive product_type. Stripe metadata.product_type:", metadataType, "price.id:", priceId)
        }
        if (needsPeriodFix && (periodStart || periodEnd)) {
          await sql`
            UPDATE subscriptions
            SET current_period_start = ${periodStart}, current_period_end = ${periodEnd}, updated_at = NOW()
            WHERE stripe_subscription_id = ${activeSub.stripe_subscription_id}
          `
          updates.push("current_period_start/end from Stripe")
        }
        if (updates.length > 0) console.log("  Updated DB:", updates.join(", "))
      } catch (e: any) {
        console.error("  Error syncing from Stripe:", e.message)
      }
      }
    }
    console.log("")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
