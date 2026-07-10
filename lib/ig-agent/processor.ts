import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generateIgFlagNotificationEmail } from "@/lib/email/templates/ig-flag-notification"
import { envFlag } from "@/lib/env-flags"
import { isLikelyIcelandic, mergeIcelandicTag } from "@/lib/ig-agent/icelandic-detector"
import { generateSandraDraft } from "@/lib/ig-agent/responder"
import { triageIncomingMessage } from "@/lib/ig-agent/triage"
import type { IgChannel } from "@/lib/ig-agent/types"

const ADMIN_EMAIL = process.env.IG_AGENT_ADMIN_EMAIL || "ssa@ssasocial.com"
const IG_AGENT_ALERT_COOLDOWN_MINUTES = Number(process.env.IG_AGENT_ALERT_COOLDOWN_MINUTES || 20)

type InboundMessage = {
  igUserId: string
  username?: string | null
  fullName?: string | null
  profilePicUrl?: string | null
  messageId?: string | null
  threadId?: string | null
  channel: IgChannel
  text: string
  timestamp?: number | null
  rawPayload?: unknown
}

type ContactRow = {
  ig_user_id: string
  username: string | null
  full_name: string | null
  profile_pic_url: string | null
  is_icelandic: boolean | null
  is_verified_friend: boolean | null
  tags: string[] | null
}

// Stopgap volume cap: with no cooldown, a burst of flagged messages (e.g. real drafting
// failing over to the same canned fallback) sent one email per conversation. This caps it to
// one email per window; every flagged conversation still lands in /admin/ig-inbox regardless
// of whether an email fired for it. Reuses the admin_alert_sent table cron-health-check already
// writes to, keyed on a fixed alert_id since this is a global rate limit, not per-conversation.
async function wasIgAgentAlertSentRecently(): Promise<boolean> {
  try {
    const [result] = await sql`
      SELECT sent_at FROM admin_alert_sent
      WHERE alert_id = 'ig-agent-flagged'
        AND sent_at > NOW() - ${IG_AGENT_ALERT_COOLDOWN_MINUTES} * INTERVAL '1 minute'
      ORDER BY sent_at DESC
      LIMIT 1
    `
    return Boolean(result?.sent_at)
  } catch (error) {
    console.warn("[ig-agent] Alert cooldown check unavailable:", error)
    return false
  }
}

async function recordIgAgentAlertSent() {
  try {
    await sql`
      INSERT INTO admin_alert_sent (alert_id, alert_type, sent_at, alert_data)
      VALUES ('ig-agent-flagged', 'ig_flag_notification', NOW(), '{}'::jsonb)
    `
  } catch (error) {
    console.warn("[ig-agent] Failed to record alert sent:", error)
  }
}

async function notifyIfFlagged(params: {
  conversationId: number
  username: string
  message: string
  flagReason: string
  draftResponse?: string | null
  profilePicUrl?: string | null
  isIcelandic?: boolean
}) {
  // Sandra reviews these conversations in the admin/community-manager queue. Per-conversation
  // emails created a second noisy inbox (45 messages in ~25 hours during the July 10 incident),
  // so alerts are opt-in only. The conversations are still stored and flagged normally.
  if (!envFlag("IG_AGENT_EMAIL_ALERTS_ENABLED", false)) return

  if (await wasIgAgentAlertSentRecently()) return

  const email = generateIgFlagNotificationEmail(params)
  await sendEmail({
    to: ADMIN_EMAIL,
    from: "SSELFIE Agent <hello@sselfie.ai>",
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType: "ig_flag_notification",
    tags: ["ig-agent", "flagged"],
  })
  await recordIgAgentAlertSent()
}

export async function processInboundInstagramMessage(input: InboundMessage) {
  if (!input.text.trim() || !input.igUserId) {
    return { processed: false, reason: "empty_message" }
  }

  const isIcelandic = isLikelyIcelandic(input.username, input.fullName)
  const baseTags = mergeIcelandicTag([], isIcelandic)

  const contacts = await sql`
    INSERT INTO ig_contacts (
      ig_user_id,
      username,
      full_name,
      profile_pic_url,
      is_icelandic,
      tags,
      updated_at
    )
    VALUES (
      ${input.igUserId},
      ${input.username || null},
      ${input.fullName || null},
      ${input.profilePicUrl || null},
      ${isIcelandic},
      ${baseTags},
      NOW()
    )
    ON CONFLICT (ig_user_id)
    DO UPDATE SET
      username = COALESCE(EXCLUDED.username, ig_contacts.username),
      full_name = COALESCE(EXCLUDED.full_name, ig_contacts.full_name),
      profile_pic_url = COALESCE(EXCLUDED.profile_pic_url, ig_contacts.profile_pic_url),
      is_icelandic = ig_contacts.is_icelandic OR EXCLUDED.is_icelandic,
      tags = (
        SELECT ARRAY(SELECT DISTINCT UNNEST(COALESCE(ig_contacts.tags, '{}') || COALESCE(EXCLUDED.tags, '{}')))
      ),
      updated_at = NOW()
    RETURNING ig_user_id, username, full_name, profile_pic_url, is_icelandic, is_verified_friend, tags
  `
  const contact = contacts[0] as ContactRow

  const threadId = input.threadId || `${input.channel}:${input.igUserId}`
  const sentAt = input.timestamp
    ? new Date(input.timestamp).toISOString()
    : new Date().toISOString()

  const conversations = await sql`
    INSERT INTO ig_conversations (
      ig_user_id,
      ig_thread_id,
      channel,
      status,
      first_message_at,
      last_message_at,
      updated_at
    )
    VALUES (
      ${input.igUserId},
      ${threadId},
      ${input.channel},
      'pending',
      ${sentAt},
      ${sentAt},
      NOW()
    )
    ON CONFLICT (ig_thread_id)
    DO UPDATE SET
      last_message_at = GREATEST(ig_conversations.last_message_at, EXCLUDED.last_message_at),
      updated_at = NOW()
    RETURNING id, status
  `
  const conversationId = Number(conversations[0]?.id)

  if (input.messageId) {
    const existing = await sql`
      SELECT id FROM ig_messages WHERE ig_message_id = ${input.messageId} LIMIT 1
    `
    if (existing.length > 0) {
      return { processed: true, duplicate: true, conversationId }
    }
  }

  const triage = triageIncomingMessage(input.text, {
    igUserId: input.igUserId,
    username: contact.username,
    fullName: contact.full_name,
    profilePicUrl: contact.profile_pic_url,
    isIcelandic: Boolean(contact.is_icelandic),
    isVerifiedFriend: Boolean(contact.is_verified_friend),
    tags: contact.tags || [],
  })

  await sql`
    INSERT INTO ig_messages (
      conversation_id,
      ig_message_id,
      from_type,
      content,
      ai_intent,
      growth_tags,
      send_status,
      source_payload,
      sent_at
    )
    VALUES (
      ${conversationId},
      ${input.messageId || null},
      'contact',
      ${input.text},
      ${triage.intent},
      ${triage.growthTags},
      'received',
      ${JSON.stringify(input.rawPayload || {})},
      ${sentAt}
    )
    ON CONFLICT (ig_message_id) DO NOTHING
  `

  const skipDraft = triage.action === "ignore" || triage.action === "keyword_handled"
  const draft = skipDraft
    ? null
    : await generateSandraDraft({
        igUserId: input.igUserId,
        latestMessage: input.text,
      })

  const shouldFlag = !skipDraft && (triage.action === "flag" || !draft || draft.confidence < 0.8)
  const status =
    triage.action === "keyword_handled" ? "auto_handled" : shouldFlag ? "flagged" : "pending"
  const flagReason =
    triage.flagReason ||
    (draft?.intent === "generation_failed"
      ? "ai_generation_failed"
      : draft && draft.confidence < 0.8
        ? "low_confidence"
        : null)

  if (draft) {
    await sql`
      INSERT INTO ig_messages (
        conversation_id,
        from_type,
        content,
        ai_generated,
        ai_confidence,
        ai_intent,
        growth_tags,
        send_status,
        delivered,
        sent_at
      )
      VALUES (
        ${conversationId},
        'agent',
        ${draft.response},
        TRUE,
        ${draft.confidence},
        ${draft.intent},
        ${draft.growthTags},
        'draft',
        FALSE,
        NOW()
      )
    `
  }

  await sql`
    UPDATE ig_conversations
    SET status = ${status},
        flag_reason = ${flagReason},
        agent_confidence = ${draft?.confidence || triage.confidenceHint},
        draft_response = ${draft?.response || null},
        draft_generated_at = ${draft ? new Date().toISOString() : null},
        updated_at = NOW()
    WHERE id = ${conversationId}
  `

  if (shouldFlag) {
    await notifyIfFlagged({
      conversationId,
      username: contact.username || input.username || input.igUserId,
      message: input.text,
      flagReason: flagReason || triage.reason,
      draftResponse: draft?.response,
      profilePicUrl: contact.profile_pic_url,
      isIcelandic: Boolean(contact.is_icelandic),
    })
  }

  return {
    processed: true,
    conversationId,
    triage,
    draft,
    status,
  }
}
