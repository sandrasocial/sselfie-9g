/**
 * Funnel digest (read-only).
 *
 * Membership-first funnel (approx, DB-based):
 * - New users
 * - Freebie activation (welcome bonus grants, first output)
 * - Generation attempts/success
 * - Checkout abandons (abandoned_checkouts)
 * - Paid conversion (subscriptions / payments / paid credit purchases)
 *
 * Writes: output/automation/funnel-digest-YYYY-MM-DD.md
 */
import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function outPath(now: Date) {
  const dir = resolve(process.cwd(), "output", "automation")
  mkdirSync(dir, { recursive: true })
  const name = `funnel-digest-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
  return resolve(dir, name)
}

function iso(x: any) {
  try {
    return new Date(x).toISOString()
  } catch {
    return String(x ?? "")
  }
}

function pct(num: number, den: number) {
  if (!den) return "0.0%"
  return `${((num / den) * 100).toFixed(1)}%`
}

async function safeQuery<T = any>(label: string, q: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await q() }
  } catch (err: any) {
    return { ok: false, error: `${label}: ${err?.message || String(err)}` }
  }
}

async function main() {
  const now = new Date()
  const hours = Number(process.env.FUNNEL_DIGEST_WINDOW_HOURS || 24)

  const lines: string[] = []
  lines.push(`# Funnel digest`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Window: last ${hours} hour(s)`)
  lines.push(``)

  const newUsers = await safeQuery("new_users", async () => {
    const rows = await sql`
      SELECT COUNT(*)::int AS count, MAX(created_at) AS last_created
      FROM users
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
        AND LOWER(COALESCE(email, '')) NOT LIKE '%@playwright.test%'
        AND LOWER(COALESCE(email, '')) NOT LIKE '%@test.local%'
        AND LOWER(COALESCE(email, '')) NOT LIKE '%@sselfie.test%'
        AND LOWER(COALESCE(email, '')) NOT LIKE '%@sselfie-studio.internal%'
        AND LOWER(COALESCE(email, '')) NOT LIKE '%@example.com%'
        AND LOWER(COALESCE(email, '')) NOT LIKE '%@yopmail.com%'
        AND LOWER(COALESCE(email, '')) NOT LIKE '%@%.test'
        AND LOWER(COALESCE(email, '')) NOT LIKE '%@%.local'
        AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'test-%'
        AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'test_%'
        AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'playwright%'
        AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'e2e%'
        AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'debug%'
        AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'smoke+%'
        AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'qa-%'
        AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'qa_%'
    `
    return rows[0]
  })

  const newSubs = await safeQuery("new_subscriptions", async () => {
    const rows = await sql`
      SELECT
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'past_due')::int AS past_due,
        COUNT(*) FILTER (WHERE stripe_subscription_id IS NOT NULL AND TRIM(stripe_subscription_id) <> '')::int AS linked_to_stripe_sub,
        MAX(created_at) AS last_created
      FROM subscriptions
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
        AND COALESCE(is_test_mode, FALSE) = FALSE
    `
    return rows[0]
  })

  const abandons = await safeQuery("abandoned_checkouts", async () => {
    const rows = await sql`
      SELECT COUNT(*)::int AS count, MAX(created_at) AS last_created
      FROM abandoned_checkouts
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    `
    return rows[0]
  })

  const payments = await safeQuery("stripe_payments", async () => {
    const rows = await sql`
      SELECT
        COUNT(*)::int AS count,
        SUM(COALESCE(amount_cents, 0))::bigint AS amount_cents_sum,
        MAX(created_at) AS last_created,
        COUNT(*) FILTER (WHERE payment_type = 'subscription')::int AS subscription_payment_count
      FROM stripe_payments
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
        AND COALESCE(is_test_mode, FALSE) = FALSE
        AND status = 'succeeded'
    `
    return rows[0]
  })

  const freebieBonus = await safeQuery("freebie_bonus_grants", async () => {
    const rows = await sql`
      SELECT
        COUNT(*)::int AS count,
        COUNT(DISTINCT user_id)::int AS users_count,
        SUM(COALESCE(amount, 0))::bigint AS credits_sum,
        MAX(ct.created_at) AS last_created
      FROM credit_transactions ct
      LEFT JOIN users u
        ON u.id::text = ct.user_id::text
        OR u.stack_auth_user_id::text = ct.user_id::text
      WHERE ct.transaction_type = 'bonus'
        AND description = 'Free blueprint credits (welcome bonus)'
        AND ct.created_at > NOW() - ${hours} * INTERVAL '1 hour'
        AND COALESCE(is_test_mode, FALSE) = FALSE
        AND (
          u.id IS NULL
          OR (
            LOWER(COALESCE(u.email, '')) NOT LIKE '%@playwright.test%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@test.local%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@sselfie.test%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@sselfie-studio.internal%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@example.com%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@yopmail.com%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@%.test'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@%.local'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'test-%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'test_%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'playwright%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'e2e%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'debug%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'smoke+%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'qa-%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'qa_%'
          )
        )
    `
    return rows[0]
  })

  const freebieUsage = await safeQuery("freebie_bonus_usage", async () => {
    const rows = await sql`
      WITH bonus_users AS (
        SELECT DISTINCT ct.user_id
        FROM credit_transactions ct
        LEFT JOIN users u
          ON u.id::text = ct.user_id::text
          OR u.stack_auth_user_id::text = ct.user_id::text
        WHERE ct.transaction_type = 'bonus'
          AND ct.description = 'Free blueprint credits (welcome bonus)'
          AND ct.created_at > NOW() - ${hours} * INTERVAL '1 hour'
          AND COALESCE(ct.is_test_mode, FALSE) = FALSE
          AND (
            u.id IS NULL
            OR (
              LOWER(COALESCE(u.email, '')) NOT LIKE '%@playwright.test%'
              AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@test.local%'
              AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@sselfie.test%'
              AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@sselfie-studio.internal%'
              AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@example.com%'
              AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@yopmail.com%'
              AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@%.test'
              AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@%.local'
              AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'test-%'
              AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'test_%'
              AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'playwright%'
              AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'e2e%'
              AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'debug%'
              AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'smoke+%'
              AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'qa-%'
              AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'qa_%'
            )
          )
      )
      SELECT
        COUNT(DISTINCT bu.user_id)::int AS bonus_users,
        COUNT(DISTINCT ct.user_id)::int AS users_who_spent,
        COUNT(ct.id)::int AS spend_events,
        ABS(SUM(COALESCE(ct.amount, 0)))::bigint AS credits_spent
      FROM bonus_users bu
      LEFT JOIN credit_transactions ct
        ON ct.user_id = bu.user_id
       AND ct.created_at > NOW() - ${hours} * INTERVAL '1 hour'
       AND ct.amount < 0
       AND ct.transaction_type IN ('image', 'training', 'animation')
       AND COALESCE(ct.is_test_mode, FALSE) = FALSE
    `
    return rows[0]
  })

  const paidCreditPurchases = await safeQuery("paid_credit_purchases", async () => {
    const rows = await sql`
      SELECT
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE stripe_payment_id IS NOT NULL AND TRIM(stripe_payment_id) <> '')::int AS linked_count,
        SUM(COALESCE(payment_amount_cents, 0))::bigint AS payment_amount_cents_sum,
        SUM(COALESCE(amount, 0))::bigint AS credits_sum,
        MAX(created_at) AS last_created
      FROM credit_transactions
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
        AND transaction_type = 'purchase'
        AND COALESCE(is_test_mode, FALSE) = FALSE
    `
    return rows[0]
  })

  const activation = await safeQuery("activation_first_output", async () => {
    const rows = await sql`
      WITH cohort AS (
        SELECT id::text AS user_id, created_at
        FROM users
        WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
          AND LOWER(COALESCE(email, '')) NOT LIKE '%@playwright.test%'
          AND LOWER(COALESCE(email, '')) NOT LIKE '%@test.local%'
          AND LOWER(COALESCE(email, '')) NOT LIKE '%@sselfie.test%'
          AND LOWER(COALESCE(email, '')) NOT LIKE '%@sselfie-studio.internal%'
          AND LOWER(COALESCE(email, '')) NOT LIKE '%@example.com%'
          AND LOWER(COALESCE(email, '')) NOT LIKE '%@yopmail.com%'
          AND LOWER(COALESCE(email, '')) NOT LIKE '%@%.test'
          AND LOWER(COALESCE(email, '')) NOT LIKE '%@%.local'
          AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'test-%'
          AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'test_%'
          AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'playwright%'
          AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'e2e%'
          AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'debug%'
          AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'smoke+%'
          AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'qa-%'
          AND LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) NOT LIKE 'qa_%'
      ),
      outputs AS (
        SELECT user_id::text AS user_id, created_at FROM ai_images
        UNION ALL
        SELECT user_id::text AS user_id, created_at FROM generation_trackers
      ),
      first_output AS (
        SELECT c.user_id, MIN(o.created_at) AS first_output_at
        FROM cohort c
        JOIN outputs o ON o.user_id = c.user_id
        WHERE o.created_at >= c.created_at
        GROUP BY c.user_id
      )
      SELECT
        COUNT(*)::int AS signups_in_window,
        COUNT(*) FILTER (WHERE c.created_at <= NOW() - INTERVAL '24 hours')::int AS matured_signups,
        COUNT(*) FILTER (WHERE f.user_id IS NOT NULL)::int AS activated_any_time,
        COUNT(*) FILTER (
          WHERE f.first_output_at IS NOT NULL
            AND f.first_output_at < c.created_at + INTERVAL '24 hours'
        )::int AS activated_within_24h
      FROM cohort c
      LEFT JOIN first_output f ON f.user_id = c.user_id
    `
    return rows[0]
  })

  const activationGenerateClicks = await safeQuery("activation_generate_clicks", async () => {
    const rows = await sql`
      SELECT
        COUNT(*)::int AS count,
        COUNT(DISTINCT ae.user_id)::int AS users_count,
        MAX(ae.created_at) AS last_created
      FROM analytics_events ae
      JOIN users u
        ON u.id::text = ae.user_id::text
        OR u.stack_auth_user_id::text = ae.user_id::text
      WHERE ae.created_at > NOW() - ${hours} * INTERVAL '1 hour'
        AND ae.event_name = 'activation_continue_clicked'
        AND COALESCE(ae.properties->>'next_action', '') = 'generate_first_image'
        AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@playwright.test%'
        AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@test.local%'
        AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@sselfie.test%'
        AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@sselfie-studio.internal%'
        AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@example.com%'
        AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@yopmail.com%'
        AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@%.test'
        AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@%.local'
        AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'test-%'
        AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'test_%'
        AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'playwright%'
        AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'e2e%'
        AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'debug%'
        AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'smoke+%'
        AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'qa-%'
        AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'qa_%'
    `
    return rows[0]
  })

  const genTrackers = await safeQuery("generation_trackers", async () => {
    const rows = await sql`
      SELECT gt.status, COUNT(*)::int AS count, MAX(gt.created_at) AS last_created
      FROM generation_trackers gt
      LEFT JOIN users u
        ON u.id::text = gt.user_id::text
        OR u.stack_auth_user_id::text = gt.user_id::text
      WHERE gt.created_at > NOW() - ${hours} * INTERVAL '1 hour'
        AND (
          u.id IS NULL
          OR (
            LOWER(COALESCE(u.email, '')) NOT LIKE '%@playwright.test%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@test.local%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@sselfie.test%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@sselfie-studio.internal%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@example.com%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@yopmail.com%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@%.test'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@%.local'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'test-%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'test_%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'playwright%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'e2e%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'debug%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'smoke+%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'qa-%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'qa_%'
          )
        )
      GROUP BY status
      ORDER BY count DESC
      LIMIT 20
    `
    return rows
  })

  const aiImages = await safeQuery("ai_images", async () => {
    const rows = await sql`
      SELECT COUNT(*)::int AS count, MAX(ai.created_at) AS last_created
      FROM ai_images ai
      LEFT JOIN users u
        ON u.id::text = ai.user_id::text
        OR u.stack_auth_user_id::text = ai.user_id::text
      WHERE ai.created_at > NOW() - ${hours} * INTERVAL '1 hour'
        AND (
          u.id IS NULL
          OR (
            LOWER(COALESCE(u.email, '')) NOT LIKE '%@playwright.test%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@test.local%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@sselfie.test%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@sselfie-studio.internal%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@example.com%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@yopmail.com%'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@%.test'
            AND LOWER(COALESCE(u.email, '')) NOT LIKE '%@%.local'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'test-%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'test_%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'playwright%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'e2e%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'debug%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'smoke+%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'qa-%'
            AND LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) NOT LIKE 'qa_%'
          )
        )
    `
    return rows[0]
  })

  lines.push(`## Acquisition`)
  if (newUsers.ok) {
    lines.push(`- New users: ${newUsers.value.count} (last: ${newUsers.value.last_created ? iso(newUsers.value.last_created) : "n/a"})`)
  } else {
    lines.push(`- Error: ${newUsers.error}`)
  }
  lines.push(``)

  lines.push(`## Checkout and revenue`)
  if (abandons.ok) {
    lines.push(`- Abandoned checkouts: ${abandons.value.count} (last: ${abandons.value.last_created ? iso(abandons.value.last_created) : "n/a"})`)
  } else {
    lines.push(`- Error: ${abandons.error}`)
  }
  if (newSubs.ok) {
    lines.push(
      `- New subscriptions: ${newSubs.value.count} (active: ${newSubs.value.active}, past_due: ${newSubs.value.past_due}, linked_to_stripe_sub: ${newSubs.value.linked_to_stripe_sub}) (last: ${
        newSubs.value.last_created ? iso(newSubs.value.last_created) : "n/a"
      })`,
    )
  } else {
    lines.push(`- Error: ${newSubs.error}`)
  }
  if (payments.ok) {
    lines.push(
      `- Stripe payments (succeeded): ${payments.value.count} (subscription payments: ${payments.value.subscription_payment_count}, sum_cents: ${
        payments.value.amount_cents_sum ?? 0
      }) (last: ${
        payments.value.last_created ? iso(payments.value.last_created) : "n/a"
      })`,
    )
  } else {
    lines.push(`- Error: ${payments.error}`)
  }
  lines.push(``)

  lines.push(`## Freebie activation (welcome bonus)`)
  if (freebieBonus.ok) {
    lines.push(
      `- Welcome bonus grants: ${freebieBonus.value.count} tx to ${freebieBonus.value.users_count} user(s), credits: ${freebieBonus.value.credits_sum ?? 0} (last: ${
        freebieBonus.value.last_created ? iso(freebieBonus.value.last_created) : "n/a"
      })`,
    )
  } else {
    lines.push(`- Error: ${freebieBonus.error}`)
  }
  if (freebieUsage.ok) {
    lines.push(
      `- Bonus users who spent credits: ${freebieUsage.value.users_who_spent}/${freebieUsage.value.bonus_users} (${pct(
        Number(freebieUsage.value.users_who_spent ?? 0),
        Number(freebieUsage.value.bonus_users ?? 0),
      )}) (spend events: ${freebieUsage.value.spend_events}, credits_spent: ${freebieUsage.value.credits_spent ?? 0})`,
    )
  } else {
    lines.push(`- Error: ${freebieUsage.error}`)
  }
  if (activation.ok) {
    lines.push(
      `- First output activation (new users in window): ${activation.value.activated_any_time}/${activation.value.signups_in_window} (${pct(
        Number(activation.value.activated_any_time ?? 0),
        Number(activation.value.signups_in_window ?? 0),
      )})`,
    )
    const maturedSignups = Number(activation.value.matured_signups ?? 0)
    const d1ActivationLabel =
      maturedSignups > 0
        ? `${activation.value.activated_within_24h}/${activation.value.matured_signups} (${pct(
            Number(activation.value.activated_within_24h ?? 0),
            maturedSignups,
          )})`
        : `n/a (no signups are 24h old yet)`
    lines.push(
      `- D1 first-output activation (matured signups only): ${d1ActivationLabel}`,
    )
  } else {
    lines.push(`- Error: ${activation.error}`)
  }
  if (activationGenerateClicks.ok) {
    lines.push(
      `- Activation continue clicks (to first generation): ${activationGenerateClicks.value.count} (${activationGenerateClicks.value.users_count} users) (last: ${
        activationGenerateClicks.value.last_created ? iso(activationGenerateClicks.value.last_created) : "n/a"
      })`,
    )
  } else {
    lines.push(`- Error: ${activationGenerateClicks.error}`)
  }
  lines.push(``)

  lines.push(`## Paid conversion via credits`)
  if (paidCreditPurchases.ok) {
    lines.push(
      `- Paid credit purchases: ${paidCreditPurchases.value.count} (linked stripe_payment_id: ${paidCreditPurchases.value.linked_count}, payment_sum_cents: ${
        paidCreditPurchases.value.payment_amount_cents_sum ?? 0
      }, credits_granted: ${paidCreditPurchases.value.credits_sum ?? 0}) (last: ${
        paidCreditPurchases.value.last_created ? iso(paidCreditPurchases.value.last_created) : "n/a"
      })`,
    )
  } else {
    lines.push(`- Error: ${paidCreditPurchases.error}`)
  }
  lines.push(``)

  lines.push(`## Generation`)
  if (genTrackers.ok) {
    lines.push(`Generation trackers by status:`)
    for (const row of genTrackers.value as any[]) {
      lines.push(`- ${row.status}: ${row.count} (last: ${row.last_created ? iso(row.last_created) : "n/a"})`)
    }
  } else {
    lines.push(`- Error: ${genTrackers.error}`)
  }
  if (aiImages.ok) {
    lines.push(`- AI images created: ${aiImages.value.count} (last: ${aiImages.value.last_created ? iso(aiImages.value.last_created) : "n/a"})`)
  } else {
    lines.push(`- Error: ${aiImages.error}`)
  }
  lines.push(``)

  lines.push(`## Notes`)
  lines.push(`- Welcome bonus credits are top-of-funnel activation credits and are not cash revenue.`)
  lines.push(`- Synthetic smoke-test accounts are excluded from signup, activation, and generation metrics.`)
  if (newSubs.ok && payments.ok && Number(newSubs.value.count ?? 0) > 0 && Number(payments.value.count ?? 0) === 0) {
    lines.push(`- New subscriptions with zero succeeded Stripe payments in the same window usually indicate webhook timing lag, non-active/past_due subscription rows, or manual/backfilled records.`)
  }
  lines.push(``)

  const path = outPath(now)
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[funnel-digest] wrote ${path}`)
}

main().catch((err) => {
  console.error("[funnel-digest] failed:", err)
  process.exitCode = 1
})
