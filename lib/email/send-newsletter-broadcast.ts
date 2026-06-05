import "server-only"
import { getDb } from '@/lib/db/client'
import { processEmailLinks, validateEmailLinks } from './link-library'
import { getAudienceContacts } from "@/lib/resend/get-audience-contacts"
import {
  assertNoUnsupportedBroadcastMergeTags,
  computeBroadcastPreflight,
} from "@/lib/email/broadcast-preflight"
import { requireResendClient } from "@/lib/resend/client"

export interface BroadcastRecipientPreflight {
  totalAudience: number
  suppressedCount: number
  sendableCount: number
}

export async function getBroadcastRecipientPreflight(audienceId: string): Promise<BroadcastRecipientPreflight> {
  const sql = getDb()
  const audienceContacts = await getAudienceContacts(audienceId)
  const audienceEmails = audienceContacts.map((contact) => contact.email)

  const suppressedRows = await sql`
    SELECT DISTINCT LOWER(TRIM(user_email)) AS email
    FROM email_logs
    WHERE user_email IS NOT NULL
      AND status IN ('bounced', 'hard_bounced', 'complained')
  `

  const suppressedEmails = (suppressedRows as Array<{ email?: string | null }>).map((row) => row.email ?? null)
  const preflight = computeBroadcastPreflight({
    audienceEmails,
    suppressedEmails,
  })

  return {
    totalAudience: preflight.totalAudience,
    suppressedCount: preflight.suppressedCount,
    sendableCount: preflight.sendableCount,
  }
}

/**
 * Send approved newsletter campaign as Resend Broadcast
 *
 * This function:
 * 1. Loads approved campaign from database
 * 2. Processes links with UTM tracking
 * 3. Validates email content
 * 4. Creates broadcast in Resend
 * 5. Updates campaign status in database
 *
 * @param campaignId - Database ID of the campaign to send
 * @returns Resend broadcast ID
 */
export async function sendNewsletterBroadcast(
  campaignId: number,
  preflightInput?: BroadcastRecipientPreflight,
): Promise<string> {
  const sql = getDb()
  const resend = requireResendClient()

  console.log(`[Newsletter Broadcast] Starting send for campaign ${campaignId}`)

  // 1. Load campaign from database
  const campaigns = await sql`
    SELECT * FROM admin_email_campaigns
    WHERE id = ${campaignId}
    AND approval_status = 'approved'
    AND status IN ('scheduled', 'draft')
  `

  if (campaigns.length === 0) {
    throw new Error(
      `Campaign ${campaignId} not found, not approved, or already sent. ` +
      `Check approval_status='approved' and status='scheduled' or 'draft'.`
    )
  }

  const campaign = campaigns[0]
  if (campaign.resend_broadcast_id) {
    throw new Error(`Campaign ${campaignId} already has a Resend broadcast ID (${campaign.resend_broadcast_id}). Refusing to create a duplicate broadcast.`)
  }

  console.log(`[Newsletter Broadcast] Campaign loaded:`, {
    id: campaign.id,
    name: campaign.campaign_name,
    subject: campaign.subject_line,
    status: campaign.status,
    approval_status: campaign.approval_status,
    scheduled_for: campaign.scheduled_for
  })

  // 2. Process links with UTM tracking
  let processedHTML = campaign.body_html

  // Process link placeholders
  processedHTML = processEmailLinks(
    processedHTML,
    campaign.id.toString(),
    undefined // We'll use Resend's merge tags for email-specific links
  )

  // 3. Validate email content
  const validationIssues = validateEmailLinks(processedHTML)
  assertNoUnsupportedBroadcastMergeTags(processedHTML)
  if (typeof campaign.body_text === "string") {
    assertNoUnsupportedBroadcastMergeTags(campaign.body_text)
  }

  if (validationIssues.length > 0) {
    console.warn(`[Newsletter Broadcast] Validation issues found:`, validationIssues)
    // Log to database but don't block sending (they might be false positives)
    await sql`
      UPDATE admin_email_campaigns
      SET metrics = jsonb_set(
        COALESCE(metrics, '{}'::jsonb),
        '{validation_warnings}',
        ${JSON.stringify(validationIssues)}::jsonb
      )
      WHERE id = ${campaignId}
    `
  }

  // 4. Determine Resend audience/segment
  const targetAudience = campaign.target_audience || {}
  const segmentName = targetAudience.segment || 'Main Audience'

  // Get Resend audience ID (you'll need to set this in env)
  const audienceId = process.env.RESEND_AUDIENCE_ID

  if (!audienceId) {
    throw new Error(
      'RESEND_AUDIENCE_ID not configured. ' +
      'Get this from Resend dashboard: Audience > Copy ID'
    )
  }

  console.log(`[Newsletter Broadcast] Sending to audience:`, {
    audienceId,
    segmentName,
    targetAudience
  })

  const preflight = preflightInput ?? (await getBroadcastRecipientPreflight(audienceId))
  if (preflight.sendableCount <= 0) {
    throw new Error("Broadcast preflight failed: zero sendable recipients after suppression filtering.")
  }

  await sql`
    UPDATE admin_email_campaigns
    SET total_recipients = ${preflight.sendableCount},
        metrics = COALESCE(metrics, '{}'::jsonb) || ${JSON.stringify({
          recipient_preflight: {
            total_audience: preflight.totalAudience,
            suppressed_count: preflight.suppressedCount,
            sendable_count: preflight.sendableCount,
          },
        })}::jsonb,
        updated_at = NOW()
    WHERE id = ${campaignId}
  `

  // 5. Update status to 'sending'
  await sql`
    UPDATE admin_email_campaigns
    SET status = 'sending',
        updated_at = NOW()
    WHERE id = ${campaignId}
      AND resend_broadcast_id IS NULL
  `

  // 6. Create broadcast in Resend
  try {
    const scheduledAt = campaign.scheduled_for
      ? new Date(campaign.scheduled_for)
      : undefined

    // Check if we should send immediately or schedule
    const sendImmediately = !scheduledAt || scheduledAt <= new Date()

    console.log(`[Newsletter Broadcast] Creating Resend broadcast:`, {
      sendImmediately,
      scheduledAt: scheduledAt?.toISOString()
    })

    const broadcastPayload: any = {
      audience_id: audienceId,
      from: process.env.RESEND_FROM_EMAIL || 'Sandra @ SSELFIE <hello@sselfie.ai>',
      subject: campaign.subject_line,
      html: processedHTML
    }

    // Add scheduling if needed
    if (!sendImmediately && scheduledAt) {
      broadcastPayload.scheduled_at = scheduledAt.toISOString()
    }

    const { data: broadcast, error: broadcastError } = await resend.broadcasts.create(broadcastPayload)

    if (broadcastError || !broadcast) {
      throw new Error(`Resend broadcast creation failed: ${broadcastError?.message ?? "unknown error"}`)
    }

    console.log(`[Newsletter Broadcast] ✅ Broadcast created in Resend:`, {
      id: broadcast.id,
      scheduled: !sendImmediately
    })

    // 7. Update campaign with broadcast ID and status
    await sql`
      UPDATE admin_email_campaigns
      SET resend_broadcast_id = ${broadcast.id},
          status = ${sendImmediately ? 'sent' : 'scheduled'},
          sent_at = ${sendImmediately ? new Date() : null},
          updated_at = NOW()
      WHERE id = ${campaignId}
    `

    console.log(`[Newsletter Broadcast] ✅ Campaign ${campaignId} sent successfully`)

    return broadcast.id

  } catch (error) {
    // Update status to failed
    await sql`
      UPDATE admin_email_campaigns
      SET status = 'failed',
          metrics = jsonb_set(
            COALESCE(metrics, '{}'::jsonb),
            '{error}',
            ${JSON.stringify({
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            })}::jsonb
          ),
          updated_at = NOW()
      WHERE id = ${campaignId}
    `

    console.error(`[Newsletter Broadcast] ❌ Failed to send campaign ${campaignId}:`, error)

    throw error
  }
}

/**
 * Send test email for a campaign (not as broadcast)
 *
 * @param campaignId - Campaign ID
 * @param testEmail - Email address to send test to
 */
export async function sendTestEmail(
  campaignId: number,
  testEmail: string
): Promise<void> {
  const sql = getDb()
  const resend = requireResendClient()

  // Load campaign
  const campaigns = await sql`
    SELECT * FROM admin_email_campaigns
    WHERE id = ${campaignId}
  `

  if (campaigns.length === 0) {
    throw new Error(`Campaign ${campaignId} not found`)
  }

  const campaign = campaigns[0]

  // Process links
  const processedHTML = processEmailLinks(
    campaign.body_html,
    campaign.id.toString(),
    testEmail
  )

  // Send via Resend (regular email, not broadcast)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Sandra @ SSELFIE <hello@sselfie.ai>',
    to: testEmail,
    subject: `[TEST] ${campaign.subject_line}`,
    html: processedHTML,
    tags: [
      { name: 'type', value: 'test' },
      { name: 'campaign_id', value: campaign.id.toString() }
    ]
  })

  // Update campaign with test email info
  await sql`
    UPDATE admin_email_campaigns
    SET test_email_sent_to = ${testEmail},
        test_email_sent_at = NOW(),
        updated_at = NOW()
    WHERE id = ${campaignId}
  `

  console.log(`[Test Email] Sent test of campaign ${campaignId} to ${testEmail}`)
}

/**
 * Get Resend broadcast status and update database
 *
 * @param campaignId - Campaign ID to check
 */
export async function updateBroadcastStatus(campaignId: number): Promise<void> {
  const sql = getDb()
  const resend = requireResendClient()

  const campaigns = await sql`
    SELECT resend_broadcast_id, id
    FROM admin_email_campaigns
    WHERE id = ${campaignId}
    AND resend_broadcast_id IS NOT NULL
  `

  if (campaigns.length === 0) {
    console.warn(`Campaign ${campaignId} not found or has no broadcast ID`)
    return
  }

  const campaign = campaigns[0]

  try {
    // Get broadcast details from Resend
    const { data: broadcastData, error: broadcastError } = await resend.broadcasts.get(campaign.resend_broadcast_id)
    if (broadcastError || !broadcastData) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const broadcast = broadcastData as any

    // Update metrics in database
    await sql`
      UPDATE admin_email_campaigns
      SET total_recipients = ${broadcast.sent_count || 0},
          metrics = jsonb_set(
            COALESCE(metrics, '{}'::jsonb),
            '{resend_status}',
            ${JSON.stringify({
              status: broadcast.status,
              sent_count: broadcast.sent_count,
              updated_at: new Date().toISOString()
            })}::jsonb
          ),
          updated_at = NOW()
      WHERE id = ${campaignId}
    `

    console.log(`[Broadcast Status] Updated campaign ${campaignId} with Resend stats`)

  } catch (error) {
    console.error(`[Broadcast Status] Failed to get status for campaign ${campaignId}:`, error)
  }
}
