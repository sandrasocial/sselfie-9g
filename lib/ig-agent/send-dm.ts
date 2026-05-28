import { sql } from "@/lib/db/client"

export type SendIgDmResult =
  | { sent: true; messageId: string | null }
  | { sent: false; reason: "auto_send_disabled" | "missing_connection" | "missing_page_token" | "graph_error"; error?: string }

type ConnectionRow = {
  access_token: string | null
  page_access_token?: string | null
}

/**
 * Sends Instagram DMs through Meta Graph API.
 *
 * Pre-build validation on 2026-05-28:
 * - Existing user token against /me/messages failed with GraphMethodException (#100).
 * - Page token against /me/messages reached the messaging API but failed with (#230)
 *   until pages_messaging is granted.
 * - Therefore this function is launch-gated by IG_AGENT_AUTO_SEND_ENABLED and requires
 *   page_access_token from instagram_connections after reconnecting with messaging scopes.
 */
export async function sendInstagramDm(params: {
  igUserId: string
  message: string
  conversationId: number
  fromType?: "agent" | "sandra"
}): Promise<SendIgDmResult> {
  if (process.env.IG_AGENT_AUTO_SEND_ENABLED !== "true") {
    await sql`
      INSERT INTO ig_messages (
        conversation_id,
        from_type,
        content,
        ai_generated,
        send_status,
        delivered,
        sent_at
      )
      VALUES (
        ${params.conversationId},
        ${params.fromType || "agent"},
        ${params.message},
        ${params.fromType !== "sandra"},
        ${"draft"},
        FALSE,
        NOW()
      )
    `
    return { sent: false, reason: "auto_send_disabled" }
  }

  const rows = await sql`
    SELECT access_token, page_access_token
    FROM instagram_connections
    WHERE instagram_username = 'sandra.social'
      AND is_active = TRUE
    ORDER BY updated_at DESC NULLS LAST, connected_at DESC NULLS LAST
    LIMIT 1
  `
  const connection = rows[0] as ConnectionRow | undefined

  if (!connection) return { sent: false, reason: "missing_connection" }

  const token = connection.page_access_token || connection.access_token
  if (!token) return { sent: false, reason: "missing_page_token" }

  const response = await fetch("https://graph.facebook.com/v21.0/me/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: params.igUserId },
      message: { text: params.message },
    }),
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = payload?.error?.message || `Graph API failed with status ${response.status}`
    await sql`
      INSERT INTO ig_messages (
        conversation_id,
        from_type,
        content,
        ai_generated,
        send_status,
        delivered,
        source_payload,
        sent_at
      )
      VALUES (
        ${params.conversationId},
        ${params.fromType || "agent"},
        ${params.message},
        ${params.fromType !== "sandra"},
        ${"failed"},
        FALSE,
        ${JSON.stringify(payload)},
        NOW()
      )
    `
    await sql`
      UPDATE ig_conversations
      SET status = 'flagged',
          flag_reason = COALESCE(flag_reason, 'dm_send_failed'),
          updated_at = NOW()
      WHERE id = ${params.conversationId}
    `
    return { sent: false, reason: "graph_error", error }
  }

  const messageId = payload?.message_id || payload?.recipient_id || null
  await sql`
    INSERT INTO ig_messages (
      conversation_id,
      ig_message_id,
      from_type,
      content,
      ai_generated,
      send_status,
      delivered,
      source_payload,
      sent_at
    )
    VALUES (
      ${params.conversationId},
      ${messageId},
      ${params.fromType || "agent"},
      ${params.message},
      ${params.fromType !== "sandra"},
      ${"sent"},
      TRUE,
      ${JSON.stringify(payload)},
      NOW()
    )
    ON CONFLICT (ig_message_id) DO NOTHING
  `

  return { sent: true, messageId }
}

