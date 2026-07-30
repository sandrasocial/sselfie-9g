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
import { resolve, join } from "path"
import { homedir } from "os"
config({ path: resolve(__dirname, "..", ".env.local") })
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import Stripe from "stripe"
import { put } from "@vercel/blob"
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs"
import { renderPersonalNote, renderPersonalLink } from "../lib/email/templates/stone-email"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" as any })

const MAIN_AUDIENCE = "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd"
const FROM = process.env.RESEND_FROM_EMAIL || "Sandra from SSELFIE <hello@sselfie.ai>"
const PREVIEW_TO = "ssa@ssasocial.com"

// ---------------------------------------------------------- daily life photos
// Sandra drops real-life photos straight into this Desktop folder whenever she
// wants one available for an email — no Photos.app export step needed. The
// manifest (which filenames are already used) stays in the repo since it's app
// state, not personal photo data; the photos themselves never touch the repo.
const PHOTOS_DIR = join(homedir(), "Desktop", "SSELFIE Email Photos")
const PHOTOS_MANIFEST = resolve(__dirname, "..", "content", "daily-email-photos", "used-manifest.json")
const IMG_EXT = /\.(jpe?g|png|heic)$/i

function readUsedManifest(): string[] {
  if (!existsSync(PHOTOS_MANIFEST)) return []
  try { return JSON.parse(readFileSync(PHOTOS_MANIFEST, "utf8")) } catch { return [] }
}
function writeUsedManifest(list: string[]) {
  mkdirSync(resolve(__dirname, "..", "content", "daily-email-photos"), { recursive: true })
  writeFileSync(PHOTOS_MANIFEST, JSON.stringify(list, null, 2))
}
function listUnusedPhotos(): { filename: string; mtimeMs: number }[] {
  if (!existsSync(PHOTOS_DIR)) return []
  const used = new Set(readUsedManifest())
  return readdirSync(PHOTOS_DIR)
    .filter((f) => IMG_EXT.test(f) && !used.has(f))
    .map((f) => ({ filename: f, mtimeMs: statSync(join(PHOTOS_DIR, f)).mtimeMs }))
    .sort((a, b) => a.mtimeMs - b.mtimeMs)
}

// ------------------------------------------- approved public bridge history
const DOORS = [
  { key: "vault", match: ["vault", "bathroom"], label: "Prompt Vault $37", url: "https://sselfie.ai/prompt-vault", temp: "cold" },
  { key: "starter", match: ["starter", "selfie"], label: "Starter Kit $37", url: "https://sselfie.ai/selfie-to-ai-photos", temp: "cold" },
  { key: "suite", match: ["suite membership", "suite monthly"], label: "SSELFIE SUITE €97/month", url: "https://sselfie.ai/join/studio", temp: "activation" },
  { key: "presets", match: ["preset"], label: "Presets $19 single / $39 bundle", url: "https://sselfie.ai/presets", temp: "cold" },
  { key: "story", match: [], label: "Pure story / no product ask", url: null, temp: "warm" },
] as const

// ---------------------------------------------------------- coupon products
// Maps a simple product key to live Stripe price resolution. Env stays primary,
// but coupon tools can fall back to Stripe's catalog when production-only price
// envs are missing from the local shell.
type ProductPriceConfig = {
  env: string[]
  fallback: {
    productName: string
    unitAmount: number
    currency: string
    interval?: Stripe.Price.Recurring.Interval | null
    metadataProductType?: string
  }
}

const PRODUCT_PRICE_CONFIG: Record<string, ProductPriceConfig> = {
  vault: {
    env: ["STRIPE_PRICE_PROMPT_VAULT_AFTER_FLASH", "STRIPE_PRICE_PROMPT_VAULT"],
    fallback: {
      productName: "The AI Photo Prompt Vault",
      unitAmount: 3700,
      currency: "usd",
      interval: null,
      metadataProductType: "prompt_vault",
    },
  },
  masterclass: {
    env: ["STRIPE_PRICE_MASTERCLASS"],
    fallback: { productName: "Masterclass", unitAmount: 14700, currency: "usd", interval: null },
  },
  presets_single: {
    env: ["STRIPE_PRICE_PRESETS_SINGLE"],
    fallback: { productName: "SSELFIE Presets", unitAmount: 1900, currency: "usd", interval: null },
  },
  presets_bundle: {
    env: ["STRIPE_PRICE_PRESETS_BUNDLE"],
    fallback: { productName: "SSELFIE Presets", unitAmount: 3900, currency: "usd", interval: null },
  },
  suite_monthly: {
    env: ["STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID"],
    fallback: {
      productName: "SSELFIE SUITE",
      unitAmount: 9700,
      currency: "eur",
      interval: "month",
      metadataProductType: "sselfie_studio_membership",
    },
  },
  suite_annual: {
    env: ["STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID"],
    fallback: {
      productName: "SSELFIE SUITE Annual",
      unitAmount: 97000,
      currency: "eur",
      interval: "year",
      metadataProductType: "sselfie_studio_membership",
    },
  },
}

function productMatches(price: Stripe.Price, product: Stripe.Product, config: ProductPriceConfig) {
  const fallback = config.fallback
  return product.name === fallback.productName
    && price.active
    && price.unit_amount === fallback.unitAmount
    && price.currency === fallback.currency
    && (fallback.interval === undefined || (price.recurring?.interval || null) === fallback.interval)
    && (!fallback.metadataProductType || price.metadata.product_type === fallback.metadataProductType || product.metadata.product_type === fallback.metadataProductType)
}

async function resolvePriceIdFromStripeCatalog(productKey: string, config: ProductPriceConfig): Promise<string> {
  const prices = await stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] })
  const matches = prices.data.filter((price) => {
    const product = typeof price.product === "string" ? null : price.product
    return product && !product.deleted && productMatches(price, product, config)
  })

  if (matches.length === 1) return matches[0].id
  if (matches.length > 1) {
    throw new Error(`multiple live Stripe prices matched productKey "${productKey}": ${matches.map((price) => price.id).join(", ")}`)
  }

  const hint = `${config.fallback.productName} ${config.fallback.unitAmount / 100} ${config.fallback.currency}${config.fallback.interval ? `/${config.fallback.interval}` : ""}`
  throw new Error(`no local env and no active Stripe catalog price matched productKey "${productKey}" (${hint})`)
}

async function resolveProductPriceId(productKey: string): Promise<string> {
  const config = PRODUCT_PRICE_CONFIG[productKey]
  if (!config) throw new Error(`unknown productKey "${productKey}". Use one of: ${Object.keys(PRODUCT_PRICE_CONFIG).join(", ")}`)

  for (const envName of config.env) {
    const priceId = process.env[envName]?.trim()
    if (priceId) return priceId
  }

  return resolvePriceIdFromStripeCatalog(productKey, config)
}

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
    // full real subject + body excerpt of the actual last SENT broadcast — not just its name —
    // so the learning loop knows what was really said, not what the label implies
    const lastSent = items.find((b: any) => b.status === "sent")
    if (lastSent) {
      const full = await resend.broadcasts.get(lastSent.id)
      const text = (full.data as any)?.text || ""
      console.log(`\n  LAST SENT IN FULL (${String(lastSent.sent_at).slice(0, 16)}):`)
      console.log(`  subject: ${(full.data as any)?.subject || "?"}`)
      console.log(`  body: ${text.replace(/\s+/g, " ").slice(0, 300)}${text.length > 300 ? "…" : ""}`)
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

  await section("PUBLIC BRIDGE HISTORY (don't repeat the last 2 paid asks)", async () => {
    const r = await resend.broadcasts.list()
    const sent = ((r.data as any)?.data || []).filter((b: any) => b.sent_at).sort((a: any, b: any) => String(b.sent_at).localeCompare(String(a.sent_at)))
    const recentDoors = sent.slice(0, 4).map((b: any) => {
      const name = String(b.name || b.subject || "").toLowerCase()
      const hit = DOORS.find((d) => d.match.some((m) => name.includes(m)))
      return hit?.key || "story/unclear"
    })
    console.log(`  last public bridges (most recent first): ${recentDoors.join(", ") || "none yet"}`)
    console.log(`  don't repeat: ${recentDoors.slice(0, 2).join(", ") || "n/a"}`)
    for (const d of DOORS) console.log(`  - ${d.key} [${d.temp}]: ${d.label}${d.url ? " -> " + d.url : ""}`)
  })

  await section(`DAILY LIFE PHOTOS (drop new ones into ~/Desktop/SSELFIE Email Photos)`, async () => {
    const pool = listUnusedPhotos()
    console.log(`  ${pool.length} unused photo(s) waiting`)
    for (const p of pool.slice(0, 10)) console.log(`  ${p.filename}`)
    if (pool.length) {
      console.log(`  Pass one that fits today's story via "heroPhoto":"<filename>" in the draft JSON. It renders at the BOTTOM of the email, near the sign-off — not as the lead.`)
      console.log(`  Omit heroPhoto to auto-use the oldest unused one, or set "heroPhoto":"none" to skip entirely.`)
    } else {
      console.log(`  none available — email will be sent without a photo unless Sandra adds some to the folder.`)
    }
  })

  await section("ACTIVE STRIPE DISCOUNT CODES (don't duplicate — reuse if one already fits)", async () => {
    const promos = await stripe.promotionCodes.list({ active: true, limit: 10, expand: ["data.promotion.coupon"] })
    if (!promos.data.length) { console.log("  none active right now"); return }
    for (const p of promos.data) {
      // 2026-01-28.clover shape: promo.coupon moved under promo.promotion.coupon (see docs/business Stripe shape notes)
      const c = p.promotion?.coupon as Stripe.Coupon | undefined
      const exp = p.expires_at ? new Date(p.expires_at * 1000).toISOString().slice(0, 16) : "no expiry set"
      const amount = c ? (c.percent_off ? `${c.percent_off}%` : `${c.amount_off}¢`) : "?"
      console.log(`  ${p.code} | ${amount} off | expires ${exp} | redeemed ${p.times_redeemed}x`)
    }
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
  heroPhoto?: string        // filename from the DAILY LIFE PHOTOS pool; omit = auto-pick oldest unused; "none" = skip
}

function buildHtml(c: EmailContent, heroImageUrl?: string | null): string {
  const p = (html: string, mb = 18) => `<p style="margin:0 0 ${mb}px;">${html}</p>`
  const blocks: string[] = []
  c.paragraphs.forEach((para, i) => {
    blocks.push(p(para))
    if (i === c.ctaAfterIndex) blocks.push(p(renderPersonalLink(c.ctaLabel, c.ctaUrl), 22))
  })
  // photo sits at the BOTTOM, near the sign-off — a closing note, not the lead
  if (heroImageUrl) {
    blocks.push(`<p style="margin:8px 0 22px;"><img src="${heroImageUrl}" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;outline:none;text-decoration:none;" /></p>`)
  }
  blocks.push(`<p style="margin:28px 0 0;color:#0A0A0A;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-style:italic;">Sandra x</p>`)
  blocks.push(`<p style="margin:34px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9B9189;"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9B9189;text-decoration:underline;">Unsubscribe</a></p>`)
  return renderPersonalNote({ title: c.subject, bodyHtml: blocks.join("\n"), signoff: "" })
}

async function resolveHeroPhoto(c: EmailContent): Promise<{ url: string; filename: string } | null> {
  if (c.heroPhoto === "none") return null
  let filename = c.heroPhoto
  if (!filename) {
    const pool = listUnusedPhotos()
    if (!pool.length) return null
    filename = pool[0].filename
  }
  const full = join(PHOTOS_DIR, filename)
  if (!existsSync(full)) throw new Error(`heroPhoto "${filename}" not found in ${PHOTOS_DIR} — check the DAILY LIFE PHOTOS list from 'data'`)
  const buffer = readFileSync(full)
  const blob = await put(`daily-email-photos/${Date.now()}-${filename}`, buffer, { access: "public" })
  return { url: blob.url, filename }
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

  const hero = await resolveHeroPhoto(c)
  const html = buildHtml(c, hero?.url)
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
    if (hero) {
      writeUsedManifest([...readUsedManifest(), hero.filename])
      console.log(`PHOTO USED -> ${hero.filename} (marked used, won't be reused)`)
    }
  }
}

async function sendBroadcast(id: string) {
  if (!id) throw new Error("send mode needs a broadcast id")
  const r = await resend.broadcasts.send(id)
  console.log("SEND ->", JSON.stringify(r))
}

// -------------------------------------------------------------- coupon mode
// coupon-propose is a safe dry run (no Stripe writes) — shows what a flash sale
// would look like so it can be reviewed before anything goes live.
// coupon-create is LIVE: it creates a real Stripe coupon + promotion code + a
// dedicated Payment Link (allow_promotion_codes:true) and returns that link's
// URL. It must NEVER run inside an unattended run — same gate as `send`.
// NOTE: the code (promotion code) only redeems through the Payment Link this
// prints, not through the normal /checkout/* pages — those don't have a promo
// code field wired in. Flash-sale traffic via this link also won't flow through
// checkout_attribution the way normal checkout does; that's expected, not a bug.
type CouponInput = {
  productKey: string
  percentOff: number
  hours: number
  code: string
  maxRedemptions?: number
}

async function planCoupon(input: CouponInput) {
  for (const k of ["productKey", "percentOff", "hours", "code"] as const) {
    if (!input[k]) throw new Error(`missing field: ${k}`)
  }
  const priceId = await resolveProductPriceId(input.productKey)
  const price = await stripe.prices.retrieve(priceId)
  const expiresAt = Math.floor(Date.now() / 1000) + Math.round(input.hours * 3600)
  const discounted = Math.round((price.unit_amount || 0) * (1 - input.percentOff / 100))
  return { priceId, price, expiresAt, discounted }
}

async function proposeCoupon() {
  const raw = await readStdin()
  const input = JSON.parse(raw) as CouponInput
  const plan = await planCoupon(input)
  console.log("COUPON PLAN (dry run — nothing created yet):")
  console.log(`  product: ${input.productKey} | price: ${plan.priceId} (${((plan.price.unit_amount || 0) / 100).toFixed(2)} ${plan.price.currency})`)
  console.log(`  code: ${input.code} | ${input.percentOff}% off -> ${(plan.discounted / 100).toFixed(2)} ${plan.price.currency}`)
  console.log(`  expires: ${new Date(plan.expiresAt * 1000).toISOString()} (${input.hours}h from now)`)
  if (input.maxRedemptions) console.log(`  max redemptions: ${input.maxRedemptions}`)
  console.log(`\nThis is ONLY live after Sandra says yes AND a human runs coupon-create with this same JSON.`)
}

async function createCoupon() {
  const raw = await readStdin()
  const input = JSON.parse(raw) as CouponInput
  const plan = await planCoupon(input)

  const coupon = await stripe.coupons.create({
    percent_off: input.percentOff,
    duration: "once",
    redeem_by: plan.expiresAt,
    name: `${input.code} (${input.productKey})`,
  })
  const promo = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: coupon.id },
    code: input.code,
    expires_at: plan.expiresAt,
    ...(input.maxRedemptions ? { max_redemptions: input.maxRedemptions } : {}),
  })
  const link = await stripe.paymentLinks.create({
    line_items: [{ price: plan.priceId, quantity: 1 }],
    allow_promotion_codes: true,
  })
  console.log("LIVE COUPON CREATED:")
  console.log(`  promo code: ${promo.code}`)
  console.log(`  expires: ${new Date(plan.expiresAt * 1000).toISOString()}`)
  console.log(`  payment link: ${link.url}`)
  console.log(`\nUse this payment link as the email CTA (not the normal /checkout page) — it's the one place the code field is offered.`)
}

async function main() {
  const mode = process.argv[2]
  if (mode === "data") return pullData()
  if (mode === "draft") return makeDraft()
  if (mode === "send") return sendBroadcast(process.argv[3])
  if (mode === "coupon-propose") return proposeCoupon()
  if (mode === "coupon-create") return createCoupon()
  console.log("usage: npx tsx scripts/daily-email-prep.ts data | draft (JSON on stdin) | send <id> | coupon-propose (JSON on stdin) | coupon-create (JSON on stdin)")
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1) })
