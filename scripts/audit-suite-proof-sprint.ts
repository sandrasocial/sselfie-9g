/**
 * Read-only audience audit for the proof-led annual SUITE test.
 *
 * This script never creates a Resend segment, prints an email address, sends an
 * email or changes a customer record. It reports only aggregate eligibility.
 *
 * Usage: pnpm exec tsx scripts/audit-suite-proof-sprint.ts
 */

/* eslint-disable no-console -- This read-only CLI reports aggregate audit results. */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { Resend, type Contact } from "resend"

import { classifySuiteProofSprintAudience } from "../lib/email/campaigns/suite-proof-sprint-audience"
import { SUITE_PROOF_SPRINT } from "../lib/email/campaigns/suite-proof-sprint-plan"

dotenv.config({ path: process.env.SSELFIE_ENV_PATH || ".env.local" })

function requiredEnv(name: string): string {
  const value = String(process.env[name] || "").trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function listAllContacts(resend: Resend, segmentId: string): Promise<Contact[]> {
  const contacts: Contact[] = []
  let after: string | undefined
  do {
    const { data, error } = await resend.contacts.list({
      segmentId,
      limit: 100,
      ...(after ? { after } : {}),
    })
    if (error) throw new Error(error.message || "Failed to list Resend contacts")
    const page = data?.data || []
    contacts.push(...page)
    if (!data?.has_more || page.length === 0) break
    after = page[page.length - 1]?.id
  } while (after)
  return contacts
}

async function main() {
  const sql = neon(requiredEnv("DATABASE_URL"))
  const resend = new Resend(requiredEnv("RESEND_API_KEY"))
  const mainAudienceId = requiredEnv("RESEND_AUDIENCE_ID")

  const [contacts, buyerRows, protectedRows, recentMailRows] = await Promise.all([
    listAllContacts(resend, mainAudienceId),
    sql`
      SELECT
        LOWER(BTRIM(COALESCE(sp.customer_email, u.email))) AS email,
        MAX(sp.payment_date)::text AS last_purchase_at
      FROM stripe_payments sp
      LEFT JOIN users u ON u.id::text = sp.user_id::text
      WHERE sp.status IN ('succeeded', 'paid')
        AND COALESCE(sp.is_test_mode, FALSE) = FALSE
        AND sp.product_type IN (
          'prompt_vault',
          'starter_kit',
          'presets_single',
          'presets_bundle',
          'selfie_visibility_bundle',
          'selfie_ai_photos_kit'
        )
        AND COALESCE(sp.customer_email, u.email) IS NOT NULL
      GROUP BY 1
    `,
    sql`
      SELECT DISTINCT LOWER(BTRIM(u.email)) AS email
      FROM users u
      JOIN subscriptions s ON s.user_id::text = u.id::text
      WHERE u.email IS NOT NULL
        AND COALESCE(s.is_test_mode, FALSE) = FALSE
        AND (
          (s.product_type IN (
            'sselfie_studio_membership',
            'brand_studio_membership',
            'pro',
            'vault_maya'
          ) AND s.status = 'active')
          OR (
            s.product_type IN ('suite_trial', 'selfie_visibility_bundle_pass')
            AND s.status = 'active'
            AND s.trial_ends_at > NOW()
          )
        )
    `,
    sql`
      SELECT
        LOWER(BTRIM(user_email)) AS email,
        MAX(COALESCE(sent_at, created_at))::text AS last_delivery_at
      FROM email_logs
      WHERE status IN ('sent', 'delivered')
        AND COALESCE(sent_at, created_at) > NOW() - INTERVAL '48 hours'
      GROUP BY 1
    `,
  ])

  const contactByEmail = new Map(
    contacts.map(contact => [contact.email.trim().toLowerCase(), contact] as const)
  )
  const protectedEmails = new Set(
    (protectedRows as { email?: string | null }[])
      .map(row => String(row.email || "").trim().toLowerCase())
      .filter(Boolean)
  )
  const recentMailByEmail = new Map(
    (recentMailRows as { email?: string | null; last_delivery_at?: string | null }[])
      .map(row => [
        String(row.email || "").trim().toLowerCase(),
        row.last_delivery_at || null,
      ] as const)
      .filter(([email]) => Boolean(email))
  )

  let notInMainAudience = 0
  const candidates = (buyerRows as { email?: string | null; last_purchase_at?: string | null }[])
    .flatMap(row => {
      const email = String(row.email || "").trim().toLowerCase()
      const contact = contactByEmail.get(email)
      if (!contact) {
        notInMainAudience += 1
        return []
      }
      return [{
        email,
        firstName: contact.first_name,
        unsubscribed: contact.unsubscribed,
        isCommerceBuyer: true,
        hasProtectedAccess: protectedEmails.has(email),
        lastPurchaseAt: row.last_purchase_at,
        lastMarketingDeliveryAt: recentMailByEmail.get(email),
      }]
    })

  const result = classifySuiteProofSprintAudience({
    candidates,
    now: new Date(),
    cooldownHours: SUITE_PROOF_SPRINT.cooldownHours,
    maxAudience: SUITE_PROOF_SPRINT.maxAudience,
  })

  console.log("SUITE proof sprint audience audit")
  console.log(`- main Resend contacts: ${contacts.length}`)
  console.log(`- verified commerce buyers: ${buyerRows.length}`)
  console.log(`- buyers outside main audience: ${notInMainAudience}`)
  console.log(`- protected active access: ${result.excluded.protected_access}`)
  console.log(`- unsubscribed: ${result.excluded.unsubscribed}`)
  console.log(`- inside ${SUITE_PROOF_SPRINT.cooldownHours}h email cooldown: ${result.excluded.marketing_cooldown}`)
  console.log(`- eligible now: ${result.eligible.length}`)
  console.log(`- test cap: ${SUITE_PROOF_SPRINT.maxAudience}`)
  console.log("- mutation: none")
  console.log("- send: none")
}

main().catch(error => {
  console.error("SUITE proof sprint audit failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
