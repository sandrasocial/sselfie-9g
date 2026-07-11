/**
 * Daily Story Sequence Engine — mechanical core for the `daily-story-sequence-draft`
 * scheduled task. Takes the day's already-drafted customer email (from
 * `daily-email-prep.ts`, which runs earlier the same morning and creates a Resend
 * broadcast DRAFT) and gives Claude everything needed to repurpose it into a 7-slide
 * Instagram Story sequence. This script only handles data + storage + the preview
 * send to Sandra — it never writes the slide copy itself, and it never posts or
 * sends anything to the customer list.
 *
 *   npx tsx scripts/daily-story-sequence-prep.ts data          # read-only: today's draft email + recent sequences
 *   npx tsx scripts/daily-story-sequence-prep.ts draft <<'JSON'
 *     { ...7 slides... }
 *   JSON
 */
import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(__dirname, "..", ".env.local") })
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { renderPersonalNote } from "../lib/email/templates/stone-email"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)
const PREVIEW_TO = "ssa@ssasocial.com"
const FROM = process.env.RESEND_FROM_EMAIL || "Sandra from SSELFIE <hello@sselfie.ai>"

const SLIDE_ROLES = [
  "hook",
  "emotional_recognition",
  "belief_shift",
  "personal_mirror",
  "stuck_point",
  "offer_bridge",
  "cta",
] as const

const ROLE_LABEL: Record<(typeof SLIDE_ROLES)[number], string> = {
  hook: "Hook",
  emotional_recognition: "Emotional recognition",
  belief_shift: "Belief shift",
  personal_mirror: "Your personal mirror",
  stuck_point: "The stuck point",
  offer_bridge: "Bridge to the offer",
  cta: "The CTA",
}

async function section(label: string, fn: () => Promise<void>) {
  try {
    console.log(`\n=== ${label} ===`)
    await fn()
  } catch (e: any) {
    console.log(`\n=== ${label} === (FAILED: ${e.message})`)
  }
}

async function pullData() {
  await section("TODAY'S DRAFT EMAIL (the source material)", async () => {
    const r = await resend.broadcasts.list()
    const items = ((r.data as any)?.data || []).sort((a: any, b: any) =>
      String(b.created_at).localeCompare(String(a.created_at))
    )
    const draft = items.find((b: any) => b.status === "draft")
    if (!draft) {
      console.log("  no draft broadcast found — daily-email-draft may not have run yet today. STOP and say so.")
      return
    }
    const full = await resend.broadcasts.get(draft.id)
    const data = full.data as any
    console.log(`  broadcast id: ${draft.id}`)
    console.log(`  name: ${draft.name || "(unnamed)"}`)
    console.log(`  subject: ${data?.subject || "?"}`)
    console.log(`  created: ${String(draft.created_at).slice(0, 16)}`)
    console.log(`\n  FULL BODY TEXT:`)
    console.log(`  ${(data?.text || "").replace(/\s+/g, " ").trim()}`)
  })

  await section("THIS WEEK'S PLANNED THEME FOR TODAY (from the Monday weekly brief, if any)", async () => {
    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
    const rows = (await sql`
      SELECT period_start, payload->'dailyStories' AS daily_stories
      FROM analytics_reports WHERE report_type='content_brief_weekly'
      ORDER BY period_start DESC LIMIT 1
    `) as any[]
    const stories = rows[0]?.daily_stories as any[] | undefined
    const today = stories?.find((s: any) => String(s?.day || "").toLowerCase() === weekday.toLowerCase())
    if (!today) {
      console.log(`  no planned theme found for ${weekday} in the latest weekly brief — derive purely from today's email.`)
      return
    }
    console.log(`  week of ${String(rows[0].period_start).slice(0, 10)} planned this for ${weekday}:`)
    console.log(`  theme: ${today.theme || "?"}`)
    if (today.conversationType) console.log(`  conversationType: ${today.conversationType}`)
    if (today.offerMention) console.log(`  offerMention: ${today.offerMention}`)
    console.log(`  Use this as a steer for tone/theme continuity with the week's plan — the email you drafted this morning is still the primary source for the actual story content.`)
  })

  await section("RECENT STORY SEQUENCES (don't reuse the same hook two days running)", async () => {
    const rows = (await sql`
      SELECT period_start, payload->'slides'->0->>'text' AS last_hook, payload->>'offerLabel' AS offer
      FROM analytics_reports WHERE report_type='story_sequence_daily'
      ORDER BY period_start DESC LIMIT 5
    `) as any[]
    if (!rows.length) {
      console.log("  none yet")
      return
    }
    for (const row of rows) {
      console.log(`  ${String(row.period_start).slice(0, 10)} | offer: ${row.offer || "?"} | hook: ${(row.last_hook || "").slice(0, 100)}`)
    }
  })
}

// --------------------------------------------------------------- draft mode
type Slide = { role: (typeof SLIDE_ROLES)[number]; text: string }
type DraftInput = {
  sourceEmailId?: string
  sourceSubject?: string
  slides: Slide[]
  offerLabel: string
  offerUrl?: string
  notes?: string
}

function todayUTC(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString("utf8")
}

async function makeDraft() {
  const raw = await readStdin()
  if (!raw.trim()) throw new Error("draft mode expects JSON on stdin (slides[7], offerLabel, optional sourceEmailId/sourceSubject/offerUrl/notes)")
  const input = JSON.parse(raw) as DraftInput

  if (!Array.isArray(input.slides) || input.slides.length !== 7) {
    throw new Error(`slides must be an array of exactly 7 — got ${input.slides?.length ?? 0}`)
  }
  input.slides.forEach((s, i) => {
    if (!SLIDE_ROLES.includes(s.role)) throw new Error(`slide ${i + 1} has invalid role "${s.role}" — expected one of ${SLIDE_ROLES.join(", ")}`)
    if (SLIDE_ROLES[i] !== s.role) throw new Error(`slide ${i + 1} must be role "${SLIDE_ROLES[i]}" (framework order is fixed) — got "${s.role}"`)
    if (!s.text?.trim()) throw new Error(`slide ${i + 1} (${s.role}) has no text`)
  })
  if (!input.offerLabel) throw new Error("missing field: offerLabel")

  const day = todayUTC()
  const dayEnd = new Date(day)
  dayEnd.setUTCHours(23, 59, 59, 999)

  const payload = {
    sourceEmailId: input.sourceEmailId || null,
    sourceSubject: input.sourceSubject || null,
    slides: input.slides,
    offerLabel: input.offerLabel,
    offerUrl: input.offerUrl || null,
    notes: input.notes || null,
  }

  const rows = (await sql`
    INSERT INTO analytics_reports (report_type, period_start, period_end, payload)
    VALUES ('story_sequence_daily', ${day.toISOString()}, ${dayEnd.toISOString()}, ${JSON.stringify(payload)}::jsonb)
    ON CONFLICT (report_type, period_start, period_end) DO UPDATE
    SET payload = EXCLUDED.payload, created_at = NOW()
    RETURNING id
  `) as any[]
  console.log("STORED -> analytics_reports id", rows[0]?.id)

  const slidesHtml = input.slides
    .map((s, i) => {
      const label = ROLE_LABEL[s.role]
      return `<p style="margin:0 0 26px;"><span style="display:block;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#9B9189;margin:0 0 6px;">Slide ${i + 1} · ${label}</span>${s.text.replace(/\n/g, "<br/>")}</p>`
    })
    .join("")
  const bodyHtml = `${slidesHtml}${input.notes ? `<p style="margin:20px 0 0;font-size:13px;color:#818283;">${input.notes.replace(/\n/g, "<br/>")}</p>` : ""}`

  const html = renderPersonalNote({
    title: `Story sequence · ${input.offerLabel}`,
    bodyHtml,
    signoff: "",
  })
  const subject = `Today's Story sequence — ${input.sourceSubject || input.offerLabel}`
  const sent = await resend.emails.send({ from: FROM, to: PREVIEW_TO, subject, html })
  console.log("EMAIL ->", sent.error ? JSON.stringify(sent.error) : sent.data?.id)
}

async function main() {
  const mode = process.argv[2]
  if (mode === "data") return pullData()
  if (mode === "draft") return makeDraft()
  console.log("usage: npx tsx scripts/daily-story-sequence-prep.ts data | draft (JSON on stdin)")
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
