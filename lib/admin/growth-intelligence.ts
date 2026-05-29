import "server-only"

import { sql } from "@/lib/db/client"
import { evaluateGrowthPriorities } from "@/lib/admin/growth-intelligence-evaluator"
export { formatMoney, formatPercent, percent, type GrowthPriority } from "@/lib/admin/growth-intelligence-evaluator"

function toInt(value: unknown): number {
  return Number(value || 0)
}

export type GrowthIntelligenceReport = Awaited<ReturnType<typeof getGrowthIntelligenceReport>>

export async function getGrowthIntelligenceReport(windowDays: number) {
  const interval = `${windowDays} days`

  const [eventCountsRow] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE event_name = 'ai_prompts_subscribed')::int AS ai_prompt_optins,
      COUNT(*) FILTER (WHERE event_name = 'ai_prompts_access_opened')::int AS ai_prompt_access_opens,
      COUNT(*) FILTER (WHERE event_name = 'ai_prompts_prompt_copied')::int AS free_prompt_copies,
      COUNT(*) FILTER (WHERE event_name = 'ai_prompts_prompt_vault_click')::int AS free_to_vault_clicks,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_landing_view')::int AS vault_visits,
      COUNT(*) FILTER (
        WHERE event_name = 'checkout_start'
          AND properties->>'product_type' = 'prompt_vault'
      )::int AS checkout_starts,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_checkout_recovery_sent')::int AS recovery_sends,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_checkout_success')::int AS checkout_successes,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_access_opened')::int AS vault_access_opens,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_prompt_viewed')::int AS vault_prompt_views,
      COUNT(*) FILTER (WHERE event_name = 'prompt_vault_prompt_copied')::int AS vault_prompt_copies
    FROM analytics_events
    WHERE created_at > NOW() - (${interval}::interval)
  `

  const [paymentCountsRow] = await sql`
    SELECT
      COUNT(*)::int AS purchases,
      COALESCE(SUM(amount_cents), 0)::int AS revenue_cents
    FROM stripe_payments
    WHERE payment_date > NOW() - (${interval}::interval)
      AND status IN ('succeeded', 'paid')
      AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      AND (product_type = 'prompt_vault' OR payment_type = 'prompt_vault')
  `

  const [buyerCountsRow] = await sql`
    SELECT COUNT(DISTINCT email)::int AS buyers
    FROM freebie_subscribers
    WHERE COALESCE(converted_at, updated_at, created_at) > NOW() - (${interval}::interval)
      AND email IS NOT NULL
      AND email <> ''
      AND (
        source = 'prompt-vault-paid'
        OR 'prompt-vault-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
      )
  `

  const [igCountsRow] = await sql`
    SELECT
      COUNT(DISTINCT c.id)::int AS conversations,
      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'flagged')::int AS flagged,
      COUNT(DISTINCT c.id) FILTER (WHERE c.channel = 'dm')::int AS dm_conversations,
      COUNT(DISTINCT c.id) FILTER (WHERE c.channel = 'comment')::int AS comment_conversations,
      COUNT(m.id) FILTER (WHERE m.from_type = 'contact')::int AS inbound_messages,
      COUNT(m.id) FILTER (WHERE m.from_type = 'agent' AND m.send_status = 'draft')::int AS agent_drafts
    FROM ig_conversations c
    LEFT JOIN ig_messages m ON m.conversation_id = c.id
    WHERE c.created_at > NOW() - (${interval}::interval)
  `

  const topGrowthTags = await sql`
    SELECT tag, COUNT(*)::int AS count
    FROM ig_messages,
    LATERAL UNNEST(COALESCE(growth_tags, ARRAY[]::text[])) AS tag
    WHERE created_at > NOW() - (${interval}::interval)
    GROUP BY tag
    ORDER BY count DESC, tag ASC
    LIMIT 12
  `

  const topPromptSignals = await sql`
    WITH prompt_events AS (
      SELECT
        NULLIF(properties->>'prompt_title', '') AS prompt_title,
        NULLIF(properties->>'prompt_number', '') AS prompt_number,
        NULLIF(properties->>'mood', '') AS mood,
        COUNT(*) FILTER (WHERE event_name = 'prompt_vault_prompt_viewed')::int AS views,
        COUNT(*) FILTER (WHERE event_name = 'prompt_vault_prompt_copied')::int AS copies
      FROM analytics_events
      WHERE created_at > NOW() - (${interval}::interval)
        AND event_name IN ('prompt_vault_prompt_viewed', 'prompt_vault_prompt_copied')
      GROUP BY 1, 2, 3
    )
    SELECT prompt_title, prompt_number, mood, views, copies, (views + (copies * 3))::int AS score
    FROM prompt_events
    WHERE prompt_title IS NOT NULL
    ORDER BY score DESC, copies DESC, views DESC
    LIMIT 12
  `

  const freePromptSignals = await sql`
    SELECT
      NULLIF(properties->>'prompt_title', '') AS prompt_title,
      NULLIF(properties->>'prompt_number', '') AS prompt_number,
      COUNT(*)::int AS copies
    FROM analytics_events
    WHERE created_at > NOW() - (${interval}::interval)
      AND event_name = 'ai_prompts_prompt_copied'
    GROUP BY 1, 2
    ORDER BY copies DESC, prompt_number ASC
    LIMIT 8
  `

  const attributionRows = await sql`
    SELECT
      NULLIF(source, '') AS source,
      NULLIF(utm_source, '') AS utm_source,
      NULLIF(utm_medium, '') AS utm_medium,
      NULLIF(utm_campaign, '') AS utm_campaign,
      NULLIF(utm_content, '') AS utm_content,
      NULLIF(entry_post_slug, '') AS entry_post_slug,
      NULLIF(cta_keyword, '') AS cta_keyword,
      NULLIF(buyer_stage, '') AS buyer_stage,
      COUNT(*)::int AS checkout_starts,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS purchases,
      COUNT(*) FILTER (WHERE recovery_email_sent_at IS NOT NULL)::int AS recovery_sends
    FROM checkout_attribution
    WHERE created_at > NOW() - (${interval}::interval)
      AND product_type = 'prompt_vault'
    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
    ORDER BY purchases DESC, checkout_starts DESC
    LIMIT 12
  `

  const recentIgSignals = await sql`
    SELECT
      c.id,
      c.channel,
      c.status,
      c.flag_reason,
      COALESCE(ct.username, c.ig_user_id) AS username,
      latest.content AS latest_message,
      latest.growth_tags
    FROM ig_conversations c
    JOIN ig_contacts ct ON ct.ig_user_id = c.ig_user_id
    LEFT JOIN LATERAL (
      SELECT content, growth_tags
      FROM ig_messages
      WHERE conversation_id = c.id AND from_type = 'contact'
      ORDER BY sent_at DESC, id DESC
      LIMIT 1
    ) latest ON TRUE
    WHERE c.created_at > NOW() - (${interval}::interval)
    ORDER BY c.last_message_at DESC NULLS LAST, c.id DESC
    LIMIT 8
  `

  const eventCounts = {
    aiPromptOptins: toInt(eventCountsRow?.ai_prompt_optins),
    aiPromptAccessOpens: toInt(eventCountsRow?.ai_prompt_access_opens),
    freePromptCopies: toInt(eventCountsRow?.free_prompt_copies),
    freeToVaultClicks: toInt(eventCountsRow?.free_to_vault_clicks),
    vaultVisits: toInt(eventCountsRow?.vault_visits),
    checkoutStarts: toInt(eventCountsRow?.checkout_starts),
    recoverySends: toInt(eventCountsRow?.recovery_sends),
    checkoutSuccesses: toInt(eventCountsRow?.checkout_successes),
    vaultAccessOpens: toInt(eventCountsRow?.vault_access_opens),
    vaultPromptViews: toInt(eventCountsRow?.vault_prompt_views),
    vaultPromptCopies: toInt(eventCountsRow?.vault_prompt_copies),
  }

  const paymentCounts = {
    purchases: toInt(paymentCountsRow?.purchases),
    revenueCents: toInt(paymentCountsRow?.revenue_cents),
  }

  const buyerCounts = {
    buyers: toInt(buyerCountsRow?.buyers),
  }

  const igCounts = {
    conversations: toInt(igCountsRow?.conversations),
    flagged: toInt(igCountsRow?.flagged),
    dmConversations: toInt(igCountsRow?.dm_conversations),
    commentConversations: toInt(igCountsRow?.comment_conversations),
    inboundMessages: toInt(igCountsRow?.inbound_messages),
    agentDrafts: toInt(igCountsRow?.agent_drafts),
  }

  const priorities = evaluateGrowthPriorities({
    vaultVisits: eventCounts.vaultVisits,
    freeToVaultClicks: eventCounts.freeToVaultClicks,
    checkoutStarts: eventCounts.checkoutStarts,
    purchases: paymentCounts.purchases || eventCounts.checkoutSuccesses,
    promptCopies: eventCounts.vaultPromptCopies,
    buyers: buyerCounts.buyers || paymentCounts.purchases,
    flaggedIgConversations: igCounts.flagged,
    igGrowthSignals: topGrowthTags.length,
  })

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    eventCounts,
    paymentCounts,
    buyerCounts,
    igCounts,
    priorities,
    topGrowthTags,
    topPromptSignals,
    freePromptSignals,
    attributionRows,
    recentIgSignals,
  }
}
