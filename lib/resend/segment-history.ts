import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY)
const RATE_LIMIT_DELAY_MS = 600

function humanizeSequenceTag(tagKey: string) {
  return tagKey
    .replace("sequence_", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

async function getOrCreateHistorySegment(tagKey: string) {
  const existing = await sql`
    SELECT segment_id
    FROM resend_segment_registry
    WHERE key = ${tagKey}
    LIMIT 1
  `

  if (existing.length > 0) {
    return existing[0].segment_id as string
  }

  const name = `Sequence History: ${humanizeSequenceTag(tagKey)}`
  const { data, error } = await resend.segments.create({ name })
  if (error || !data?.id) {
    throw new Error(error?.message || "Failed to create history segment")
  }

  await sql`
    INSERT INTO resend_segment_registry (key, segment_id, name, kind)
    VALUES (${tagKey}, ${data.id}, ${name}, 'history')
    ON CONFLICT (key) DO NOTHING
  `

  return data.id
}

export async function addContactsToHistorySegment(
  tagKey: string,
  contacts: Array<{ email: string; firstName?: string | null }>,
) {
  if (!process.env.RESEND_API_KEY) return
  const segmentId = await getOrCreateHistorySegment(tagKey)

  for (const contact of contacts) {
    if (!contact.email) continue
    const { error } = await resend.contacts.segments.add({
      email: contact.email,
      segmentId,
    })

    if (error && !String(error.message || "").toLowerCase().includes("already")) {
      console.warn("[v0] History segment add failed:", error.message)
    }

    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS))
  }
}
