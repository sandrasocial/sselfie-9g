import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generateIgFlagNotificationEmail } from "@/lib/email/templates/ig-flag-notification"
import { isLikelyIcelandic, mergeIcelandicTag } from "@/lib/ig-agent/icelandic-detector"
import { generateSandraDraft } from "@/lib/ig-agent/responder"
import { triageIncomingMessage } from "@/lib/ig-agent/triage"
import type { IgChannel } from "@/lib/ig-agent/types"

const ADMIN_EMAIL = process.env.IG_AGENT_ADMIN_EMAIL || "ssa@ssasocial.com"

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

async function notifyIfFlagged(params: {
  conversationId: number
  username: string
  message: string
  flagReason: string
  draftResponse?: string | null
  profilePicUrl?: string | null
  isIcelandic?: boolean
}) {
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
  const sentAt = input.timestamp ? new Date(input.timestamp).toISOString() : new Date().toISOString()

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

  const draft = triage.action === "ignore"
    ? null
    : await generateSandraDraft({
        igUserId: input.igUserId,
        latestMessage: input.text,
      })

  const shouldFlag = triage.action === "flag" || !draft || draft.confidence < 0.8
  const status = shouldFlag ? "flagged" : "pending"
  const flagReason = triage.flagReason || (draft && draft.confidence < 0.8 ? "low_confidence" : null)

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

