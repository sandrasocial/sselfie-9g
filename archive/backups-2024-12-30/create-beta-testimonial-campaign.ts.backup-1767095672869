/**
 * Helper to create a scheduled beta testimonial campaign for a user
 * Called after a user is added to the beta segment
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

export interface CreateBetaTestimonialCampaignParams {
  userEmail: string
  firstName?: string
  userId?: string
  purchaseDate?: Date
}

/**
 * Create a scheduled beta testimonial campaign for a user
 * Scheduled for 10 days after purchase/account creation
 */
export async function createBetaTestimonialCampaign(
  params: CreateBetaTestimonialCampaignParams,
): Promise<{ success: boolean; campaignId?: number; error?: string }> {
  try {
    const { userEmail, firstName, userId, purchaseDate } = params

    // Check if a beta testimonial campaign already exists for this user
    const existing = await sql`
      SELECT id FROM admin_email_campaigns
      WHERE campaign_type = 'beta_testimonial'
      AND target_audience->>'recipients' @> ${JSON.stringify([userEmail])}
      AND status IN ('draft', 'scheduled', 'sending')
      LIMIT 1
    `

    if (existing && existing.length > 0) {
      console.log(`[v0] Beta testimonial campaign already exists for ${userEmail}`)
      return { success: true, campaignId: existing[0].id }
    }

    // Calculate scheduled date (10 days from purchase or now)
    const scheduledDate = purchaseDate
      ? new Date(purchaseDate.getTime() + 10 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)

    // Create the campaign
    const result = await sql`
      INSERT INTO admin_email_campaigns (
        campaign_name,
        campaign_type,
        subject_line,
        preview_text,
        body_html,
        body_text,
        target_audience,
        scheduled_for,
        status,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        ${`Beta Testimonial Request - ${firstName || userEmail.split("@")[0]}`},
        'beta_testimonial',
        "You're helping me build something incredible ✨",
        ${null},
        ${''}, -- Template will be used, so empty HTML
        ${''}, -- Template will be used, so empty text
        ${JSON.stringify({
          recipients: [userEmail],
          resend_segment_id: process.env.RESEND_BETA_SEGMENT_ID,
          segment_type: "beta_customers",
          user_id: userId,
        })},
        ${scheduledDate.toISOString()},
        'scheduled',
        ${ADMIN_EMAIL},
        NOW(),
        NOW()
      )
      RETURNING id
    `

    const campaignId = result[0]?.id

    if (campaignId) {
      console.log(`[v0] Created beta testimonial campaign ${campaignId} for ${userEmail}, scheduled for ${scheduledDate.toISOString()}`)
      return { success: true, campaignId }
    } else {
      return { success: false, error: "Failed to create campaign" }
    }
  } catch (error: any) {
    console.error(`[v0] Error creating beta testimonial campaign for ${params.userEmail}:`, error)
    return {
      success: false,
      error: error?.message || "Unknown error",
    }
  }
}

