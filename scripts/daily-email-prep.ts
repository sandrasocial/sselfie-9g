/**
 * Daily Email Engine — mechanical core for the `daily-email-draft` scheduled task.
 *
 * The scheduled agent must run UNATTENDED (no human to answer permission prompts),
 * so it may only use already-allowlisted tools: `npx tsx scripts/*` and Read.
 * This committed script is that tool. The agent never writes a throwaway script
 * (the old failure mode — `cat >` heredocs prompt-and-die in headless runs).
 *
 *   npx tsx scripts/daily-email-prep.ts data         # read-only briefing (Stripe + DB + IG)
 *   npx tsx scripts/daily-email-prep.ts draft <<'JSON'
 *     { ...email content... }
 *   JSON
 *   npx tsx scripts/daily-email-prep.ts send <broadcastId>   # GATED — only after Sandra's yes
 *
 * Money comes from the LIVE STRIPE API only (never analytics). `draft` creates a
 * Resend broadcast DRAFT + sends Sandra a [PREVIEW]; it NEVER sends to the list.
 */
import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(__dirname, "..", ".env.local") })
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import Stripe from "stripe"
import { renderPersonalNote, renderPersonalLink } from "../lib/email/templates/stone-email"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" as any })

const MAIN_AUDIENCE = "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd"
const FROM = process.env.RESEND_FROM_EMAIL || "Sandra from SSELFIE <hello@sselfie.ai>"
const PREVIEW_TO = "ssa@ssasocial.com"

async function section(label: string, fn: () => Promise<void>) {
  try { console.log(`\n=== ${label} ===`); await fn() }
  catch (e: any) { console.log(`\n=== ${label} === (FAILED: ${e.message})`) }
}

// ---------------------------------------------------------------- data mode
async function pullData() {
  await section("LIVE STRIPE — succeeded charges, last 14d (money truth)", async () => {
    const charges = await stripe.charges.list({ limit: 40 })
    const rows = charges.data.filter(c => c.livemode && c.status === "succeeded" && !c.refunded)
    const cutoff = Date.now() - 14 * 86400000
    for (const c of rows) {
      if (c.created * 1000 < cutoff) continue
      console.log(`  ${new Date(c.created * 1000).toISOString().slice(0, 16)} | $${(c.amount / 100).toFixed(2)} ${c.currency.toUpperCase()} | ${c.description || ""}`)
    }
    const refunded = charges.data.filter(c => c.livemode && c.refunded && c.created * 1000 >= cutoff)
    if (refunded.length) console.log(`  (note: ${refunded.length} refunded charge(s) in window — NOT real revenue)`)
  })

  await section("RECENT BROADCASTS (don't repeat / don't over-mail)", async () => {
    const r = await resend.broadcasts.list()
    const items = ((r.data as any)?.data || []).sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
    for (const b of items.slice(0, 6)) {
      console.log(`  ${String(b.status).padEnd(8)} | sent:${b.sent_at ? String(b.sent_at).slice(0, 16) : "—"} | ${b.name || b.subject || b.id}`)
    }
  })

  await section("EMAIL DELIVERABILITY last 3d (email_logs)", async () => {
    const rows = await sql`
      SELECT DATE(created_at) d, status, COUNT(*)::int n FROM email_logs
      WHERE created_at > NOW() - INTERVAL '3 days' GROUP BY 1,2 ORDER BY 1 DESC, 2` as any[]
    for (const r of rows) console.log(`  ${String(r.d).slice(0, 10)} | ${String(r.status).padEnd(10)} | ${r.n}`)
  })

  await section("SEGMENTS (who to maybe target instead of full list)", async () => {
    const trials = (await sql`
      SELECT COUNT(*)::int total,
        COUNT(*) FILTER (WHERE NOT EXISTS(SELECT 1 FROM generated_images gi WHERE gi.user_id=t.user_id))::int no_photo
      FROM subscriptions t WHERE t.product_type='suite_trial'
        AND (t.is_test_mode=FALSE OR t.is_test_mode IS NULL) AND t.status='active' AND t.trial_ends_at > NOW()`)[0] as any
    console.log(`  active trials: ${trials.total} | of those with ZERO photos: ${trials.no_photo}`)
    const copiers = (await sql`
      SELECT COUNT(DISTINCT COALESCE(user_id::text, anon_id))::int n FROM analytics_events
      WHERE event_name='ai_prompts_prompt_copied' AND created_at > NOW() - INTERVAL '30 days'`)[0] as any
    console.log(`  engaged free prompt-copiers (30d): ${copiers.n}`)
    const optins = (await sql`SELECT COUNT(*)::int n FROM freebie_subscribers WHERE created_at > NOW() - INTERVAL '7 days'`)[0] as any
    console.log(`  new free opt-ins (7d): ${optins.n}`)
  })

  await section("INSTAGRAM — top recent posts (echo what's resonating)", async () => {
    const conn = (await sql`SELECT instagram_username, instagram_user_id, access_token FROM instagram_connections WHERE is_active=true ORDER BY connected_at DESC LIMIT 1`)[0] as any
    if (!conn) { console.log("  no active instagram_connections row"); return }
    const token = conn.access_token
    const prof = await (await fetch(`https://graph.facebook.com/v21.0/${conn.instagram_user_id}?fields=followers_count,media_count&access_token=${token}`)).json() as any
    console.log(`  @${conn.instagram_username} | followers: ${prof.followers_count ?? "?"} | media: ${prof.media_count ?? "?"}`)
    const media = await (await fetch(`https://graph.facebook.com/v21.0/${conn.instagram_user_id}/media?fields=caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink&limit=12&access_token=${token}`)).json() as any
    const posts = (media.data || []).map((m: any) => ({ ...m, eng: (m.like_count || 0) + (m.comments_count || 0) })).sort((a: any, b: any) => b.eng - a.eng)
    for (const m of posts.slice(0, 5)) {
      const cap = (m.caption || "").replace(/\s+/g, " ").slice(0, 90)
      console.log(`  ${String(m.timestamp).slice(0, 10)} | ❤${m.like_count || 0} 💬${m.comments_count || 0} | ${m.media_product_type || m.media_type} | ${cap}`)
    }
  })
}

// --------------------------------------------------------------- draft mode
type EmailContent = {
  subject: string
  name: string
  paragraphs: string[]      // each becomes a <p>; include "Hey {{{contact.first_name|there}}} 🤍" first
  ctaLabel: string
  ctaUrl: string
  ctaAfterIndex: number     // insert the CTA link after this paragraph (0-based)
  audienceId?: string       // defaults to Main Audience
}

function buildHtml(c: EmailContent): string {
  const p = (html: string, mb = 18) => `<p style="margin:0 0 ${mb}px;">${html}</p>`
  const blocks: string[] = []
  c.paragraphs.forEach((para, i) => {
    blocks.push(p(para))
    if (i === c.ctaAfterIndex) blocks.push(p(renderPersonalLink(c.ctaLabel, c.ctaUrl), 22))
  })
  blocks.push(`<p style="margin:28px 0 0;color:#0A0A0A;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-style:italic;">Sandra x</p>`)
  blocks.push(`<p style="margin:34px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9B9189;"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9B9189;text-decoration:underline;">Unsubscribe</a></p>`)
  return renderPersonalNote({ title: c.subject, bodyHtml: blocks.join("\n"), signoff: "" })
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString("utf8")
}

async function makeDraft() {
  const raw = await readStdin()
  if (!raw.trim()) throw new Error("draft mode expects JSON on stdin (subject, name, paragraphs[], ctaLabel, ctaUrl, ctaAfterIndex)")
  const c = JSON.parse(raw) as EmailContent
  for (const k of ["subject", "name", "ctaLabel", "ctaUrl"] as const) if (!c[k]) throw new Error(`missing field: ${k}`)
  if (!Array.isArray(c.paragraphs) || !c.paragraphs.length) throw new Error("paragraphs[] required")
  const html = buildHtml(c)
  const audienceId = c.audienceId || MAIN_AUDIENCE

  const previewHtml = html
    .replaceAll("{{{contact.first_name|there}}}", "there")
    .replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", "https://sselfie.ai")
  const prev = await resend.emails.send({ from: FROM, to: PREVIEW_TO, subject: `[PREVIEW] ${c.subject}`, html: previewHtml })
  console.log("PREVIEW ->", prev.error ? JSON.stringify(prev.error) : prev.data?.id)

  const b = await resend.broadcasts.create({ audienceId, from: FROM, subject: c.subject, html, name: c.name })
  const id = (b as any).error ? null : (b as any).data?.id
  console.log("DRAFT ->", id || JSON.stringify((b as any).error))
  if (id) {
    console.log(`\nTo send after Sandra approves:\n  npx tsx scripts/daily-email-prep.ts send ${id}`)
  }
}

async function sendBroadcast(id: string) {
  if (!id) throw new Error("send mode needs a broadcast id")
  const r = await resend.broadcasts.send(id)
  console.log("SEND ->", JSON.stringify(r))
}

async function main() {
  const mode = process.argv[2]
  if (mode === "data") return pullData()
  if (mode === "draft") return makeDraft()
  if (mode === "send") return sendBroadcast(process.argv[3])
  console.log("usage: npx tsx scripts/daily-email-prep.ts data | draft (JSON on stdin) | send <id>")
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1) })
