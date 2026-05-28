import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generateIgMorningBriefingEmail } from "@/lib/email/templates/ig-morning-briefing"
import { createCronLogger } from "@/lib/cron-logger"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = process.env.IG_AGENT_ADMIN_EMAIL || "ssa@ssasocial.com"

type FlaggedBriefingRow = {
  id: number
  username: string
  message: string | null
  flag_reason: string | null
}

type CountRow = {
  count: number
}

type TagCountRow = {
  tag: string
  count: number
}

export async function GET(request: NextRequest) {
  const logger = createCronLogger("ig-morning-briefing")
  await logger.start()

  try {
    const authHeader = request.headers.get("authorization")
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      await logger.error(new Error("Unauthorized"), { reason: "invalid_cron_secret" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [flagged, handledRows, tagRows] = await Promise.all([
      sql`
        SELECT c.id, COALESCE(ct.username, c.ig_user_id) AS username, c.flag_reason, latest.content AS message
        FROM ig_conversations c
        JOIN ig_contacts ct ON ct.ig_user_id = c.ig_user_id
        LEFT JOIN LATERAL (
          SELECT content
          FROM ig_messages
          WHERE conversation_id = c.id AND from_type = 'contact'
          ORDER BY sent_at DESC, id DESC
          LIMIT 1
        ) latest ON TRUE
        WHERE c.status = 'flagged'
        ORDER BY c.last_message_at DESC NULLS LAST
        LIMIT 10
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM ig_conversations
        WHERE updated_at >= NOW() - INTERVAL '24 hours'
          AND status IN ('auto_handled', 'closed', 'sandra_replied', 'pending')
      `,
      sql`
        SELECT tag, COUNT(*)::int AS count
        FROM ig_messages,
        LATERAL UNNEST(COALESCE(growth_tags, '{}')) AS tag
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 8
      `,
    ])

    const email = generateIgMorningBriefingEmail({
      flagged: (flagged as FlaggedBriefingRow[]).map((row) => ({
        id: row.id,
        username: row.username,
        message: row.message || "",
        flagReason: row.flag_reason,
      })),
      handledYesterday: Number((handledRows as CountRow[])[0]?.count || 0),
      topTags: (tagRows as TagCountRow[]).map((row) => ({ tag: row.tag, count: Number(row.count || 0) })),
    })

    const result = await sendEmail({
      to: ADMIN_EMAIL,
      from: "SSELFIE Agent <hello@sselfie.ai>",
      subject: email.subject,
      html: email.html,
      text: email.text,
      emailType: "ig_morning_briefing",
      tags: ["ig-agent", "briefing"],
    })

    await logger.success({ sent: result.success, flagged: flagged.length })
    return NextResponse.json({ success: result.success, flagged: flagged.length })
  } catch (error) {
    await logger.error(error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Failed to send IG briefing" }, { status: 500 })
  }
}
