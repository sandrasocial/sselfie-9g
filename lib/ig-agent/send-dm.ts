import { sql } from "@/lib/db/client"
import { envFlag } from "@/lib/env-flags"
import { resolveInstagramConnectionMode } from "@/lib/instagram/connection-mode"

export type SendIgDmResult =
  | { sent: true; messageId: string | null }
  | {
      sent: false
      reason: "auto_send_disabled" | "missing_connection" | "missing_messaging_token" | "missing_instagram_user_id" | "graph_error"
      error?: string
    }

type ConnectionRow = {
  access_token: string | null
  page_access_token?: string | null
  instagram_user_id?: string | null
  account_type?: string | null
  id?: number
}

/**
 * Sends Instagram DMs through Meta Graph API.
 *
 * Supports both connection models:
 * - Instagram Login / IGAA token: graph.instagram.com/{ig-user-id}/messages
 * - Legacy Facebook Page token: graph.facebook.com/me/messages
 *
 * Send policy:
 * - fromType "sandra" = a human approved this exact text in /admin/ig-inbox -> SEND.
 * - fromType "agent" = automated -> only sends when IG_AGENT_AUTO_SEND_ENABLED === "true";
 *   otherwise it is stored as a draft.
 */
export async function sendInstagramDm(params: {
  igUserId: string
  message: string
  conversationId: number
  fromType?: "agent" | "sandra"
}): Promise<SendIgDmResult> {
  const fromType = params.fromType || "agent"

  if (fromType !== "sandra" && !envFlag("IG_AGENT_AUTO_SEND_ENABLED")) {
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
        ${fromType},
        ${params.message},
        ${true /* this branch only runs for fromType "agent", so the draft is always AI-generated */},
        ${"draft"},
        FALSE,
        NOW()
      )
    `
    return { sent: false, reason: "auto_send_disabled" }
  }

  const rows = await sql`
    SELECT id, instagram_user_id, access_token, page_access_token, account_type
    FROM instagram_connections
    WHERE instagram_username = 'sandra.social'
      AND is_active = TRUE
    ORDER BY updated_at DESC NULLS LAST, connected_at DESC NULLS LAST
    LIMIT 1
  `
  const connection = rows[0] as ConnectionRow | undefined

  if (!connection) return { sent: false, reason: "missing_connection" }

  const mode = resolveInstagramConnectionMode(connection)
  const token = mode === "instagram_login" ? connection.access_token : connection.page_access_token || connection.access_token
  if (!token) return { sent: false, reason: "missing_messaging_token" }
  if (mode === "instagram_login" && !connection.instagram_user_id) {
    return { sent: false, reason: "missing_instagram_user_id" }
  }

  const endpoint =
    mode === "instagram_login"
      ? `https://graph.instagram.com/v21.0/${connection.instagram_user_id}/messages`
      : "https://graph.facebook.com/v21.0/me/messages"

  const response = await fetch(endpoint, {
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
      UPDATE instagram_connections
      SET messaging_status = 'failed',
          last_messaging_test_at = NOW(),
          messaging_test_error = ${error},
          updated_at = NOW()
      WHERE id = ${connection.id || null}
    `
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
        ${fromType},
        ${params.message},
        ${fromType !== "sandra"},
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
    UPDATE instagram_connections
    SET messaging_status = 'ok',
        last_messaging_test_at = NOW(),
        messaging_test_error = NULL,
        updated_at = NOW()
    WHERE id = ${connection.id || null}
  `
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
      ${fromType},
      ${params.message},
      ${fromType !== "sandra"},
      ${"sent"},
      TRUE,
      ${JSON.stringify(payload)},
      NOW()
    )
    ON CONFLICT (ig_message_id) DO NOTHING
  `

  return { sent: true, messageId }
}
