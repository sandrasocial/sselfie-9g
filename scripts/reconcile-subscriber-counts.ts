import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { neon } from '@neondatabase/serverless'

function loadEnv(path: string) {
  const content = readFileSync(path, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...rest] = line.split('=')
    const value = rest.join('=').trim().replace(/^"|"$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

function tsForFile(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-')
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let attempt = 0
  while (attempt < 6) {
    const response = await fetch(url, init)
    if (response.status !== 429) return response

    const retryAfterHeader = response.headers.get('retry-after')
    const retryAfterMs =
      retryAfterHeader && !Number.isNaN(Number(retryAfterHeader))
        ? Number(retryAfterHeader) * 1000
        : Math.min(8000, 700 * 2 ** attempt)
    await sleep(retryAfterMs + 150)
    attempt += 1
  }
  throw new Error('Resend rate-limited after retries')
}

async function main() {
  loadEnv(resolve(process.cwd(), '.env.local'))

  const databaseUrl = process.env.DATABASE_URL
  const audienceId = process.env.RESEND_AUDIENCE_ID
  if (!databaseUrl) throw new Error('DATABASE_URL missing')
  if (!audienceId) throw new Error('RESEND_AUDIENCE_ID missing')

  const sql = neon(databaseUrl)

  const [
    freebieTotal,
    freebieUnconverted,
    blueprintTotal,
    blueprintUnconverted,
    usersWithEmail,
    uniqueUnion,
    activeRecurring,
    activeBlueprint,
    activeRawSubscriptions,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM freebie_subscribers WHERE email IS NOT NULL AND BTRIM(email) <> ''`,
    sql`SELECT COUNT(*)::int AS count FROM freebie_subscribers WHERE converted_to_user = false AND email IS NOT NULL AND BTRIM(email) <> ''`,
    sql`SELECT COUNT(*)::int AS count FROM blueprint_subscribers WHERE email IS NOT NULL AND BTRIM(email) <> ''`,
    sql`SELECT COUNT(*)::int AS count FROM blueprint_subscribers WHERE converted_to_user = false AND email IS NOT NULL AND BTRIM(email) <> ''`,
    sql`SELECT COUNT(*)::int AS count FROM users WHERE email IS NOT NULL AND BTRIM(email) <> ''`,
    sql`
      WITH all_emails AS (
        SELECT LOWER(BTRIM(email)) AS email FROM users WHERE email IS NOT NULL AND BTRIM(email) <> ''
        UNION
        SELECT LOWER(BTRIM(email)) AS email FROM freebie_subscribers WHERE email IS NOT NULL AND BTRIM(email) <> ''
        UNION
        SELECT LOWER(BTRIM(email)) AS email FROM blueprint_subscribers WHERE email IS NOT NULL AND BTRIM(email) <> ''
      )
      SELECT COUNT(*)::int AS count FROM all_emails
    `,
    sql`
      SELECT COUNT(*)::int AS count
      FROM subscriptions
      WHERE status = 'active'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND COALESCE(product_type, '') IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
        AND stripe_subscription_id IS NOT NULL
        AND BTRIM(stripe_subscription_id) <> ''
    `,
    sql`
      SELECT COUNT(*)::int AS count
      FROM subscriptions
      WHERE status = 'active'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND COALESCE(product_type, '') = 'paid_blueprint'
    `,
    sql`
      SELECT COUNT(*)::int AS count
      FROM subscriptions
      WHERE status = 'active'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
    `,
  ])

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) throw new Error('RESEND_API_KEY missing')

  const rawContacts: Array<{ id: string; email: string; unsubscribed?: boolean }> = []
  let after: string | null = null
  let hasMore = true
  let page = 0
  while (hasMore && page < 200) {
    const url = new URL(`https://api.resend.com/audiences/${audienceId}/contacts`)
    url.searchParams.set('limit', '100')
    if (after) url.searchParams.set('after', after)

    const response = await fetchWithRetry(url.toString(), {
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Resend contacts fetch failed (${response.status}): ${body}`)
    }

    const payload = await response.json()
    const pageContacts = Array.isArray(payload?.data) ? payload.data : []
    rawContacts.push(...pageContacts)

    hasMore = payload?.has_more === true
    if (hasMore && pageContacts.length > 0) {
      after = pageContacts[pageContacts.length - 1]?.id || null
      if (!after) hasMore = false
    } else {
      hasMore = false
    }
    page += 1
    if (hasMore) {
      await sleep(650)
    }
  }

  const dedupedByEmail = new Map<string, { id: string; email: string; unsubscribed?: boolean }>()
  for (const contact of rawContacts) {
    const normalized = String(contact?.email || '').trim().toLowerCase()
    if (!normalized || dedupedByEmail.has(normalized)) continue
    dedupedByEmail.set(normalized, contact)
  }

  const dedupedContacts = Array.from(dedupedByEmail.values())
  const resendTotal = dedupedContacts.length
  const resendUnsubscribed = dedupedContacts.filter((c) => c.unsubscribed === true).length
  const resendSubscribed = resendTotal - resendUnsubscribed

  const now = new Date()
  const lines = [
    '# E-01 Subscriber Reconciliation Snapshot',
    '',
    `- Timestamp: ${now.toISOString()}`,
    `- Audience ID: ${audienceId}`,
    '',
    '## Resend (source-of-truth for sendable audience)',
    '',
    `- Total contacts in audience: ${resendTotal}`,
    `- Subscribed contacts (unsubscribed=false): ${resendSubscribed}`,
    `- Unsubscribed contacts: ${resendUnsubscribed}`,
    '',
    '## Database contact inventories',
    '',
    `- users (email not null): ${usersWithEmail[0]?.count ?? 0}`,
    `- freebie_subscribers (total): ${freebieTotal[0]?.count ?? 0}`,
    `- freebie_subscribers (unconverted): ${freebieUnconverted[0]?.count ?? 0}`,
    `- blueprint_subscribers (total): ${blueprintTotal[0]?.count ?? 0}`,
    `- blueprint_subscribers (unconverted): ${blueprintUnconverted[0]?.count ?? 0}`,
    `- Unique union across users + freebie + blueprint: ${uniqueUnion[0]?.count ?? 0}`,
    '',
    '## Revenue/dashboard subscription slices',
    '',
    `- Active recurring subscribers (membership/pro): ${activeRecurring[0]?.count ?? 0}`,
    `- Active paid_blueprint entitlements: ${activeBlueprint[0]?.count ?? 0}`,
    `- Active subscriptions raw (all product types): ${activeRawSubscriptions[0]?.count ?? 0}`,
    '',
    '## Interpretation',
    '',
    '- Resend audience counts and DB subscriber table counts are different denominators by design.',
    '- Resend tracks marketing contacts (including imports, historical leads, and customers) while DB tables represent app-specific entities.',
    '- Dashboard revenue subscription counts are purchase-entitlement metrics, not mailing-list metrics.',
    '',
    '## Sign-off recommendation',
    '',
    '- Treat Resend subscribed-contact count as the canonical broadcast audience metric.',
    '- Treat DB subscription slices as product/revenue metrics only.',
    '- Keep these reported separately in ops updates to avoid future E-01 mismatch confusion.',
    '',
  ]

  const outputDir = resolve(process.cwd(), 'output/automation')
  await mkdir(outputDir, { recursive: true })
  const outputPath = resolve(outputDir, `e01-subscriber-reconciliation-${tsForFile(now)}.md`)
  await writeFile(outputPath, lines.join('\n'), 'utf8')

  console.log(`Wrote reconciliation snapshot: ${outputPath}`)
  console.log(
    JSON.stringify(
      {
        resendTotal,
        resendSubscribed,
        resendUnsubscribed,
        uniqueUnionDbContacts: uniqueUnion[0]?.count ?? 0,
        activeRecurringSubscribers: activeRecurring[0]?.count ?? 0,
        activeBlueprintEntitlements: activeBlueprint[0]?.count ?? 0,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error('[E-01 Reconciliation] Failed:', error)
  process.exit(1)
})
