import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { Resend } from "resend"
import { stellaReply, parseStellaMode } from "@/lib/stella/runtime"
import { getEmailQueue } from "@/lib/stella/email-queue"
import { renderEmailTemplate } from "@/lib/stella/email-render"

export async function POST(req: NextRequest) {
  try {
    const rawToken = (process.env.STELLA_BRIDGE_TOKEN || "").trim()
    const token = rawToken.replace(/^['"]|['"]$/g, "")
    if (!token) {
      return NextResponse.json(
        { error: "STELLA_BRIDGE_TOKEN not configured" },
        { status: 500 }
      )
    }

    const authHeader = req.headers.get("authorization") || ""
    const headerToken = authHeader.replace(/^Bearer\s+/i, "").trim()
    const altHeaderToken = (req.headers.get("x-stella-token") || "").trim()

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const bodyToken = typeof body?.token === "string" ? body.token.trim() : ""

    const provided = headerToken || altHeaderToken || bodyToken
    if (!provided || provided !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { message, mode, action, userId, contextNote } = body as {
      message?: string
      mode?: string
      action?: string
      userId?: string
      contextNote?: string
    }

    // Handle ClawDBot agent context injection
    if (action === "inject_maya_context") {
      if (!userId || !contextNote) {
        return NextResponse.json(
          { error: "Missing required fields: userId and contextNote" },
          { status: 400 }
        )
      }

      const now = new Date().toISOString()
      const contextPayload = JSON.stringify({
        agent_context_note: contextNote,
        agent_context_updated_at: now,
      })

      await sql`
        INSERT INTO maya_personal_memory (user_id, memory_data)
        VALUES (${userId}, ${contextPayload}::jsonb)
        ON CONFLICT (user_id) DO UPDATE
        SET
          memory_data = maya_personal_memory.memory_data || ${contextPayload}::jsonb,
          updated_at = NOW()
      `

      console.log(`[Bridge] inject_maya_context: wrote context note for user ${userId}`)
      return NextResponse.json({ success: true })
    }


    if (action === "email_get_queue") {
      const limitPerType = Math.min(Number((body as { limitPerType?: number }).limitPerType) || 100, 200)
      const queue = await getEmailQueue(limitPerType)
      return NextResponse.json({ success: true, queue })
    }

    if (action === "email_log_send") {
      const { email, emailType, resendMessageId, status } = body as {
        email?: string
        emailType?: string
        resendMessageId?: string
        status?: string
      }
      if (!email || !emailType) {
        return NextResponse.json({ error: "Missing email or emailType" }, { status: 400 })
      }
      await sql`
        INSERT INTO email_logs (user_email, email_type, resend_message_id, status, sent_at)
        VALUES (${email}, ${emailType}, ${resendMessageId || null}, ${status || "sent"}, NOW())
      `
      console.log(`[Bridge] email_log_send: ${emailType} for ${email}`)
      return NextResponse.json({ success: true })
    }

    if (action === "email_suppress_contact") {
      const { email, reason } = body as { email?: string; reason?: string }
      if (!email) {
        return NextResponse.json({ error: "Missing email" }, { status: 400 })
      }
      await sql`
        INSERT INTO email_logs (user_email, email_type, status, error_message, sent_at)
        VALUES (${email}, 'suppressed', 'complained', ${reason || "agent_suppress"}, NOW())
      `
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey && process.env.RESEND_AUDIENCE_ID) {
        try {
          const resend = new Resend(resendKey)
          await resend.contacts.remove({ audienceId: process.env.RESEND_AUDIENCE_ID, email })
        } catch (e) {
          console.warn("[Bridge] email_suppress_contact: Resend remove failed", e)
        }
      }
      console.log(`[Bridge] email_suppress_contact: ${email}`)
      return NextResponse.json({ success: true })
    }

    if (action === "email_health_report") {
      const sentLast7 = await sql`
        SELECT COUNT(*)::int AS c FROM email_logs
        WHERE status IN ('sent', 'delivered') AND sent_at > NOW() - INTERVAL '7 days'
      `
      const bouncedLast7 = await sql`
        SELECT COUNT(*)::int AS c FROM email_logs
        WHERE status IN ('bounced', 'complained') AND sent_at > NOW() - INTERVAL '7 days'
      `
      const suppressed = await sql`
        SELECT COUNT(*)::int AS c FROM email_logs
        WHERE status IN ('bounced', 'complained')
      `
      const totalSent = (sentLast7[0] as { c: number })?.c ?? 0
      const totalBounced = (bouncedLast7[0] as { c: number })?.c ?? 0
      const bounceRate = totalSent + totalBounced > 0 ? (totalBounced / (totalSent + totalBounced)) * 100 : 0
      const queue = await getEmailQueue(50)
      const pendingByType: Record<string, number> = {}
      for (const item of queue) {
        pendingByType[item.emailType] = (pendingByType[item.emailType] ?? 0) + 1
      }
      return NextResponse.json({
        success: true,
        sentLast7Days: totalSent,
        bounceRate: Math.round(bounceRate * 100) / 100,
        suppressedCount: (suppressed[0] as { c: number })?.c ?? 0,
        pendingByType,
      })
    }

    if (action === "email_render_template") {
      const { emailType: et, params: p } = body as { emailType?: string; params?: Record<string, unknown> }
      if (!et || !p) {
        return NextResponse.json({ error: "Missing emailType or params" }, { status: 400 })
      }
      const { html, text, subject } = renderEmailTemplate(et, p as Parameters<typeof renderEmailTemplate>[1])
      return NextResponse.json({ success: true, html, text, subject })
    }

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 })
    }

    const parsed = parseStellaMode(message)
    const finalMode = mode || parsed.mode
    const finalMessage = parsed.cleaned

    const response = await stellaReply({ message: finalMessage, mode: finalMode })

    return NextResponse.json({
      response,
      mode: finalMode,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[Stella] Bridge error:", error)
    return NextResponse.json(
      {
        error: "Bridge failure",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
