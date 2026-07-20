#!/usr/bin/env tsx

/**
 * One-time, idempotent cleanup for the July 2026 membership credit-policy release.
 *
 * Default mode is read-only. Pass --apply to:
 * - retire unsent stored email drafts that promise the old 150-credit membership;
 * - set the active monthly Stripe price metadata to 100 credits;
 * - align resumable subscriptions on that price with the same metadata.
 *
 * The One Selfie Visibility Bundle and paid 200-credit top-up are outside this scope.
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "node:path"
import Stripe from "stripe"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const APPLY = process.argv.includes("--apply")
const MEMBERSHIP_CREDITS = "100"
const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
])

function requireEnvironment(name: "DATABASE_URL" | "STRIPE_SECRET_KEY" | "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID") {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function retireStoredEmails(databaseUrl: string) {
  const sql = neon(databaseUrl)
  const campaigns = await sql`
    SELECT id
    FROM admin_email_campaigns
    WHERE status <> 'archived'
      AND campaign_name ILIKE 'Instagram Photoshoot to Studio Upgrade%'
      AND concat_ws(' ', subject_line, preview_text, body_html, body_text, target_audience::text)
          ~* '150.{0,50}credits'
  `
  const drafts = await sql`
    SELECT id
    FROM admin_email_drafts
    WHERE is_current_version = true
      AND status <> 'archived'
      AND concat_ws(' ', subject_line, preview_text, body_html, body_text, metadata::text)
          ~* '150.{0,50}credits'
  `

  console.log(`[email] stale unsent campaigns: ${campaigns.length}`)
  console.log(`[email] stale current drafts: ${drafts.length}`)

  if (APPLY) {
    await sql`
      UPDATE admin_email_campaigns
      SET status = 'archived', approval_status = 'rejected', updated_at = NOW()
      WHERE status <> 'archived'
        AND campaign_name ILIKE 'Instagram Photoshoot to Studio Upgrade%'
        AND concat_ws(' ', subject_line, preview_text, body_html, body_text, target_audience::text)
            ~* '150.{0,50}credits'
    `
    await sql`
      UPDATE admin_email_drafts
      SET status = 'archived', is_current_version = false, updated_at = NOW()
      WHERE is_current_version = true
        AND status <> 'archived'
        AND concat_ws(' ', subject_line, preview_text, body_html, body_text, metadata::text)
            ~* '150.{0,50}credits'
    `
  }

  const remainingCampaigns = await sql`
    SELECT COUNT(*)::int AS count
    FROM admin_email_campaigns
    WHERE status <> 'archived'
      AND campaign_name ILIKE 'Instagram Photoshoot to Studio Upgrade%'
      AND concat_ws(' ', subject_line, preview_text, body_html, body_text, target_audience::text)
          ~* '150.{0,50}credits'
  `
  const remainingDrafts = await sql`
    SELECT COUNT(*)::int AS count
    FROM admin_email_drafts
    WHERE is_current_version = true
      AND status <> 'archived'
      AND concat_ws(' ', subject_line, preview_text, body_html, body_text, metadata::text)
          ~* '150.{0,50}credits'
  `

  return {
    staleCampaigns: campaigns.length,
    staleDrafts: drafts.length,
    remainingCampaigns: Number(remainingCampaigns[0]?.count || 0),
    remainingDrafts: Number(remainingDrafts[0]?.count || 0),
  }
}

async function listMembershipSubscriptions(stripe: Stripe, priceId: string) {
  const subscriptions: Stripe.Subscription[] = []
  let startingAfter: string | undefined

  do {
    const page = await stripe.subscriptions.list({
      price: priceId,
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    subscriptions.push(...page.data)
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined
  } while (startingAfter)

  return subscriptions
}

async function alignStripeMetadata(secretKey: string, priceId: string) {
  const stripe = new Stripe(secretKey, { apiVersion: "2026-01-28.clover" })
  const priceBefore = await stripe.prices.retrieve(priceId)
  const subscriptions = await listMembershipSubscriptions(stripe, priceId)
  const subscriptionsToUpdate = subscriptions.filter(
    (subscription) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
      subscription.metadata.credits !== MEMBERSHIP_CREDITS,
  )

  console.log(`[stripe] price metadata credits before: ${priceBefore.metadata.credits || "unset"}`)
  console.log(`[stripe] resumable subscriptions needing alignment: ${subscriptionsToUpdate.length}`)

  if (APPLY) {
    await stripe.prices.update(priceId, {
      metadata: { ...priceBefore.metadata, credits: "100" },
    })
    for (const subscription of subscriptionsToUpdate) {
      await stripe.subscriptions.update(subscription.id, {
        metadata: { ...subscription.metadata, credits: "100" },
      })
    }
  }

  const priceAfter = await stripe.prices.retrieve(priceId)
  const subscriptionsAfter = await listMembershipSubscriptions(stripe, priceId)
  const remainingSubscriptions = subscriptionsAfter.filter(
    (subscription) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
      subscription.metadata.credits !== MEMBERSHIP_CREDITS,
  ).length

  return {
    priceCredits: priceAfter.metadata.credits || null,
    subscriptionsUpdated: APPLY ? subscriptionsToUpdate.length : 0,
    remainingSubscriptions,
  }
}

async function main() {
  console.log(APPLY ? "APPLY MODE" : "READ-ONLY MODE")

  const database = await retireStoredEmails(requireEnvironment("DATABASE_URL"))
  const stripe = await alignStripeMetadata(
    requireEnvironment("STRIPE_SECRET_KEY"),
    requireEnvironment("STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID"),
  )

  console.log(JSON.stringify({ applied: APPLY, database, stripe }, null, 2))

  if (APPLY) {
    if (
      database.remainingCampaigns !== 0 ||
      database.remainingDrafts !== 0 ||
      stripe.priceCredits !== MEMBERSHIP_CREDITS ||
      stripe.remainingSubscriptions !== 0
    ) {
      throw new Error("Membership credit-copy remediation did not verify cleanly")
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
