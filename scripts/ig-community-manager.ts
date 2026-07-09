/**
 * On-demand community manager — the mechanical core behind the sselfie-community-manager
 * Cowork skill. Sandra asks "what's in my inbox" in chat; this pulls the native side (ManyChat
 * is pulled separately via the browser/MCP tools inside the skill itself, since a script can't
 * reach those). Read-only by default; `send` only runs when Sandra has explicitly approved exact
 * text in that same chat.
 *
 *   npx tsx scripts/ig-community-manager.ts triage [--days 3]
 *   npx tsx scripts/ig-community-manager.ts send <<'JSON'
 *     { "conversationId": 123, "message": "..." }
 *   JSON
 */
import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(__dirname, "..", ".env.local") })
import { neon } from "@neondatabase/serverless"
import { sendInstagramDm } from "../lib/ig-agent/send-dm"

const sql = neon(process.env.DATABASE_URL!)

function parseDays(): number {
  const idx = process.argv.indexOf("--days")
  const value = idx >= 0 ? Number(process.argv[idx + 1]) : NaN
  return Number.isFinite(value) && value > 0 ? value : 3
}

async function triage() {
  const days = parseDays()

  const counts = await sql`
    SELECT status, COUNT(*)::int AS count
    FROM ig_conversations
    WHERE last_message_at > NOW() - (${days} || ' days')::interval
    GROUP BY status
  ` as any[]

  const needsAttention = await sql`
    SELECT
      c.id AS conversation_id,
      COALESCE(ct.username, c.ig_user_id) AS username,
      c.channel,
      c.status,
      c.flag_reason,
      c.draft_response AS current_draft,
      c.last_message_at,
      latest.content AS latest_message,
      ct.is_verified_friend,
      ct.is_icelandic
    FROM ig_conversations c
    LEFT JOIN ig_contacts ct ON ct.ig_user_id = c.ig_user_id
    LEFT JOIN LATERAL (
      SELECT content FROM ig_messages
      WHERE conversation_id = c.id AND from_type != 'agent'
      ORDER BY created_at DESC, id DESC LIMIT 1
    ) latest ON TRUE
    WHERE c.status IN ('flagged', 'pending')
      AND c.last_message_at > NOW() - (${days} || ' days')::interval
    ORDER BY
      -- surface personal/urgent flags first, then everything else by recency
      CASE WHEN c.flag_reason IN ('friend_or_family', 'icelandic_contact', 'refund_or_complaint', 'emotional_or_distressed') THEN 0 ELSE 1 END,
      c.last_message_at DESC
    LIMIT 60
  ` as any[]

  console.log(`--- STATUS COUNTS (last ${days}d) ---`)
  for (const row of counts) console.log(`${row.status}: ${row.count}`)

  console.log(`\n--- NEEDS A LOOK (${needsAttention.length}) ---`)
  if (!needsAttention.length) {
    console.log("Nothing pending or flagged in this window.")
    return
  }

  for (const r of needsAttention) {
    console.log(
      `\nconversationId=${r.conversation_id} · @${r.username} · ${r.channel} · status=${r.status} · flag=${r.flag_reason || "-"}` +
        (r.is_verified_friend ? " · FRIEND/FAMILY" : "") +
        (r.is_icelandic ? " · ICELANDIC" : ""),
    )
    console.log(`They said: ${(r.latest_message || "(no message found)").replace(/\s+/g, " ")}`)
    if (r.current_draft) console.log(`Current draft: ${r.current_draft.replace(/\s+/g, " ").slice(0, 300)}`)
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString("utf8")
}

async function send() {
  const raw = await readStdin()
  if (!raw.trim()) throw new Error("send mode expects JSON on stdin: { conversationId, message }")
  const input = JSON.parse(raw) as { conversationId: number; message: string }
  if (!input.conversationId) throw new Error("missing field: conversationId")
  if (!input.message?.trim()) throw new Error("missing field: message")

  const rows = await sql`SELECT id, ig_user_id FROM ig_conversations WHERE id = ${input.conversationId}` as any[]
  const conversation = rows[0]
  if (!conversation) throw new Error(`no ig_conversations row with id ${input.conversationId}`)

  const result = await sendInstagramDm({
    igUserId: conversation.ig_user_id,
    message: input.message,
    conversationId: input.conversationId,
    fromType: "sandra",
  })

  if (result.sent) {
    await sql`UPDATE ig_conversations SET status = 'sandra_replied', updated_at = NOW() WHERE id = ${input.conversationId}`
    console.log(`SENT -> conversationId=${input.conversationId} messageId=${result.messageId}`)
  } else {
    console.log(`NOT SENT -> conversationId=${input.conversationId} reason=${result.reason} error=${result.error || ""}`)
    process.exit(1)
  }
}

async function main() {
  const mode = process.argv[2]
  if (mode === "triage") return triage()
  if (mode === "send") return send()
  console.log("usage: npx tsx scripts/ig-community-manager.ts triage [--days N] | send (JSON on stdin)")
}
main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1) })
