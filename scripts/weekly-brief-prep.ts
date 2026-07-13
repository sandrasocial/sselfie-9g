/**
 * Weekly Content Brief Engine — mechanical core for the `weekly-content-brief-draft`
 * scheduled task. Replaces the old content-brief-weekly cron (3-phase Anthropic pipeline,
 * dead since 2026-07-02 on an Anthropic credit-balance failure) with a Cowork skill that does
 * the actual research + writing live, using this script only for real data + storage.
 *
 * The app's analytics helpers are server-only and cannot be imported safely into a plain CLI
 * process, so this file queries the same source tables directly. The retired weekly generator and
 * its audience/Instagram support modules were deleted after this replacement was verified.
 *
 *   npx tsx scripts/weekly-brief-prep.ts data          # read-only: real IG/Vault/Suite data
 *   npx tsx scripts/weekly-brief-prep.ts draft <<'JSON'
 *     { ...week's content plan... }
 *   JSON
 *
 * `draft` upserts into analytics_reports (report_type "content_brief_weekly", same shape any
 * remaining reader of that table already expects) and sends Sandra a plain-language preview
 * email of the week's plan. It never sends anything to the customer list.
 */
import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(__dirname, "..", ".env.local") })
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { renderPersonalNote } from "../lib/email/templates/stone-email"
import { getStaticVaultInventory } from "../lib/ai-prompts/prompt-data"
import { validateWeeklyBriefDraft } from "../lib/content/weekly-brief-contract"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)
const PREVIEW_TO = "ssa@ssasocial.com"
const FROM = process.env.RESEND_FROM_EMAIL || "Sandra from SSELFIE <hello@sselfie.ai>"

async function section(label: string, fn: () => Promise<void>) {
  try { console.log(`\n=== ${label} ===`); await fn() }
  catch (e: any) { console.log(`\n=== ${label} === (FAILED: ${e.message})`) }
}

async function pullData() {
  await section("INSTAGRAM — account + top posts by engagement (last ~30)", async () => {
    const conn = (await sql`SELECT instagram_username, instagram_user_id, access_token FROM instagram_connections WHERE is_active=true ORDER BY connected_at DESC LIMIT 1`)[0] as any
    if (!conn) { console.log("  no active instagram_connections row"); return }
    const token = conn.access_token
    const prof = await (await fetch(`https://graph.facebook.com/v21.0/${conn.instagram_user_id}?fields=followers_count,media_count&access_token=${token}`)).json() as any
    console.log(`  @${conn.instagram_username} | followers: ${prof.followers_count ?? "?"} | media: ${prof.media_count ?? "?"}`)
    const media = await (await fetch(`https://graph.facebook.com/v21.0/${conn.instagram_user_id}/media?fields=caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink&limit=30&access_token=${token}`)).json() as any
    const posts = (media.data || []).map((m: any) => ({ ...m, eng: (m.like_count || 0) + (m.comments_count || 0) })).sort((a: any, b: any) => b.eng - a.eng)
    for (const m of posts.slice(0, 10)) {
      const cap = (m.caption || "").replace(/\s+/g, " ").slice(0, 140)
      console.log(`  ${String(m.timestamp).slice(0, 10)} | ❤${m.like_count || 0} 💬${m.comments_count || 0} | ${m.media_product_type || m.media_type} | ${cap}`)
      console.log(`    ${m.permalink}`)
    }
  })

  await section("TOP FREE PROMPT COPIES (last 14d)", async () => {
    const rows = await sql`
      SELECT COALESCE(NULLIF(properties->>'prompt_title', ''), NULLIF(properties->>'title', ''), 'Unknown prompt') AS title,
        COUNT(*)::int AS copies
      FROM analytics_events
      WHERE event_name = 'ai_prompts_prompt_copied' AND created_at > NOW() - INTERVAL '14 days'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 10
    ` as any[]
    for (const r of rows) console.log(`  ${r.copies}x | ${r.title}`)
  })

  await section("VAULT FUNNEL (last 14d)", async () => {
    const visits = (await sql`SELECT COUNT(*)::int n FROM analytics_events WHERE event_name = 'prompt_vault_landing_view' AND created_at > NOW() - INTERVAL '14 days'`)[0] as any
    const checkoutStarts = (await sql`SELECT COUNT(*)::int n FROM analytics_events WHERE event_name ILIKE '%checkout_start%' AND created_at > NOW() - INTERVAL '14 days'`)[0] as any
    const purchases = (await sql`SELECT COUNT(*)::int n, COALESCE(SUM(amount_cents),0)::bigint cents FROM stripe_payments WHERE product_type='prompt_vault' AND status IN ('succeeded','paid') AND (is_test_mode=FALSE OR is_test_mode IS NULL) AND payment_date > NOW() - INTERVAL '14 days'`)[0] as any
    console.log(`  vault page views: ${visits?.n ?? 0} | checkout starts: ${checkoutStarts?.n ?? 0} | purchases: ${purchases?.n ?? 0} ($${(Number(purchases?.cents || 0) / 100).toFixed(0)})`)
  })

  await section("SUITE + TRIALS (live counts)", async () => {
    const suite = (await sql`
      SELECT
        COUNT(*) FILTER (WHERE product_type='sselfie_studio_membership' AND status='active')::int active,
        COUNT(*) FILTER (WHERE product_type='suite_trial' AND status='active' AND trial_ends_at > NOW())::int trials
      FROM subscriptions WHERE (is_test_mode=FALSE OR is_test_mode IS NULL)
    `)[0] as any
    console.log(`  active paid members: ${suite?.active ?? 0} | active trials: ${suite?.trials ?? 0}`)
  })

  await section("VAULT INVENTORY (static collections)", async () => {
    const inventory = getStaticVaultInventory()
    console.log(`  ${inventory.length} static collections, ${inventory.reduce((s, c) => s + c.shotCount, 0)} total shots`)
    for (const c of inventory.slice(0, 20)) console.log(`  - ${c.name} (${c.shotCount} shots)`)
  })

  await section("RECENT WEEKLY BRIEFS (don't repeat last week's angle)", async () => {
    const rows = await sql`
      SELECT period_start, payload->'demandMap'->>'strongestDemandSignal' AS signal
      FROM analytics_reports WHERE report_type='content_brief_weekly'
      ORDER BY period_start DESC LIMIT 3
    ` as any[]
    for (const r of rows) console.log(`  ${String(r.period_start).slice(0, 10)} | ${r.signal || "(no demand signal stored)"}`)
  })
}

function mondayOfThisWeek(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = d.getUTCDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString("utf8")
}

async function makeDraft() {
  const raw = await readStdin()
  if (!raw.trim()) {
    throw new Error(
      "draft mode expects canonical JSON on stdin (researchNotes, demandMap, trendRadar, contentPlan, dailyStories, emailSummary)"
    )
  }
  // This is intentionally the first operation after parsing. A malformed Cowork draft must never
  // reach the analytics table or trigger Sandra's preview email.
  const input = validateWeeklyBriefDraft(JSON.parse(raw))

  const periodStart = mondayOfThisWeek()
  const periodEnd = new Date(periodStart)
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 6)
  periodEnd.setUTCHours(23, 59, 59, 999)

  const payload = {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    contentPlan: input.contentPlan,
    dailyStories: input.dailyStories,
    demandMap: input.demandMap,
    trendRadar: input.trendRadar,
    researchNotes: input.researchNotes,
  }

  const rows = await sql`
    INSERT INTO analytics_reports (report_type, period_start, period_end, payload)
    VALUES ('content_brief_weekly', ${periodStart.toISOString()}, ${periodEnd.toISOString()}, ${JSON.stringify(payload)}::jsonb)
    ON CONFLICT (report_type, period_start, period_end) DO UPDATE
    SET payload = EXCLUDED.payload, created_at = NOW()
    RETURNING id
  ` as any[]
  console.log("STORED -> analytics_reports id", rows[0]?.id)

  const html = renderPersonalNote({
    title: "This week's content plan",
    bodyHtml: `<p style="margin:0 0 18px;">${input.emailSummary.replace(/\n/g, "<br/>")}</p><p style="margin:0;color:#818283;font-size:12px;">${input.contentPlan.length} piece(s) planned this week.</p>`,
    signoff: "",
  })
  const sent = await resend.emails.send({ from: FROM, to: PREVIEW_TO, subject: "This week's content plan", html })
  console.log("EMAIL ->", sent.error ? JSON.stringify(sent.error) : sent.data?.id)
}

async function main() {
  const mode = process.argv[2]
  if (mode === "data") return pullData()
  if (mode === "draft") return makeDraft()
  console.log("usage: npx tsx scripts/weekly-brief-prep.ts data | draft (JSON on stdin)")
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1) })
