/**
 * IG DM Drafting Engine — mechanical core for the `ig-dm-drafter` scheduled task (2x/day).
 *
 * The repo's own automated draft (lib/ig-agent/responder.ts) still runs instantly on every
 * incoming message and is a fine emergency placeholder — this task is the deliberate, context-
 * aware second pass: real judgment on real conversations, replacing whatever's there with a
 * considered reply. It NEVER sends anything — IG_AGENT_AUTO_SEND_ENABLED stays off; every draft
 * still waits in /admin/ig-inbox for Sandra's tap.
 *
 *   npx tsx scripts/ig-dm-draft-prep.ts list           # flagged conversations needing a look
 *   npx tsx scripts/ig-dm-draft-prep.ts draft <<'JSON'
 *     { "conversationId": 123, "draftText": "..." }
 *   JSON
 */
import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(__dirname, "..", ".env.local") })
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function listNeedingDrafts() {
  const rows = await sql`
    SELECT
      c.id AS conversation_id,
      COALESCE(ct.username, c.ig_user_id) AS username,
      c.channel,
      c.flag_reason,
      c.draft_response AS current_draft,
      c.last_message_at,
      latest.content AS latest_message
    FROM ig_conversations c
    LEFT JOIN ig_contacts ct ON ct.ig_user_id = c.ig_user_id
    LEFT JOIN LATERAL (
      SELECT content FROM ig_messages
      WHERE conversation_id = c.id AND from_type != 'agent'
      ORDER BY created_at DESC, id DESC LIMIT 1
    ) latest ON TRUE
    WHERE c.status = 'flagged' AND c.last_message_at > NOW() - INTERVAL '2 days'
    ORDER BY c.last_message_at DESC
    LIMIT 40
  ` as any[]

  if (!rows.length) { console.log("No flagged conversations in the last 2 days needing a look."); return }

  for (const r of rows) {
    console.log(`\n--- conversationId=${r.conversation_id} · @${r.username} · ${r.channel} · flag=${r.flag_reason || "-"} ---`)
    console.log(`They said: ${(r.latest_message || "(no message found)").replace(/\s+/g, " ")}`)
    console.log(`Current draft: ${(r.current_draft || "(none)").replace(/\s+/g, " ").slice(0, 200)}`)

    const history = await sql`
      SELECT from_type, content FROM ig_messages
      WHERE conversation_id = ${r.conversation_id}
      ORDER BY created_at DESC LIMIT 4
    ` as any[]
    if (history.length > 1) {
      console.log("Recent history (newest first):")
      for (const h of history) console.log(`  [${h.from_type}] ${(h.content || "").replace(/\s+/g, " ").slice(0, 140)}`)
    }
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString("utf8")
}

async function writeDraft() {
  const raw = await readStdin()
  if (!raw.trim()) throw new Error("draft mode expects JSON on stdin: { conversationId, draftText }")
  const input = JSON.parse(raw) as { conversationId: number; draftText: string }
  if (!input.conversationId) throw new Error("missing field: conversationId")
  if (!input.draftText?.trim()) throw new Error("missing field: draftText")

  const existing = await sql`SELECT id FROM ig_conversations WHERE id = ${input.conversationId}` as any[]
  if (!existing.length) throw new Error(`no ig_conversations row with id ${input.conversationId}`)

  await sql`
    UPDATE ig_conversations
    SET draft_response = ${input.draftText}, draft_generated_at = NOW(), updated_at = NOW()
    WHERE id = ${input.conversationId}
  `
  await sql`
    INSERT INTO ig_messages (
      conversation_id, from_type, content, ai_generated, ai_confidence, ai_intent, growth_tags, send_status, delivered, sent_at
    ) VALUES (
      ${input.conversationId}, 'agent', ${input.draftText}, TRUE, 0.9, 'cowork_reviewed', ${[]}, 'draft', FALSE, NOW()
    )
  `
  console.log(`DRAFT WRITTEN -> conversationId=${input.conversationId} (still waiting in /admin/ig-inbox for Sandra's tap, nothing sent)`)
}

async function main() {
  const mode = process.argv[2]
  if (mode === "list") return listNeedingDrafts()
  if (mode === "draft") return writeDraft()
  console.log("usage: npx tsx scripts/ig-dm-draft-prep.ts list | draft (JSON on stdin)")
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1) })
