import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * Gumloop Webhook Handler
 *
 * Receives AI-generated newsletter content from Gumloop flow and saves to database
 * for review and approval before sending.
 *
 * Expected payload from Gumloop:
 * {
 *   subject: string,           // Email subject line
 *   body_html: string,          // Email body (HTML)
 *   metadata: {                 // Optional metadata
 *     campaign_name?: string,
 *     instagram_insights?: string,
 *     strategy?: string,
 *     content_type?: string
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify webhook secret
    const authHeader = req.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.GUMLOOP_WEBHOOK_SECRET}`

    if (!process.env.GUMLOOP_WEBHOOK_SECRET) {
      console.error('[Gumloop Webhook] GUMLOOP_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      )
    }

    if (authHeader !== expectedAuth) {
      console.warn('[Gumloop Webhook] Unauthorized request attempt')
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 2. Parse and validate payload
    const payload = await req.json()
    const { subject, body_html, metadata = {} } = payload

    if (!subject || !body_html) {
      console.error('[Gumloop Webhook] Missing required fields:', { subject: !!subject, body_html: !!body_html })
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["subject", "body_html"],
          received: Object.keys(payload)
        },
        { status: 400 }
      )
    }

    // 3. Prepare campaign data
    const now = new Date()
    const campaignName = metadata.campaign_name || `Weekly Newsletter - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    // Default to next Monday at 9am if not specified
    const scheduledFor = metadata.scheduled_for || getNextMonday9am()

    console.log('[Gumloop Webhook] Creating newsletter campaign:', {
      name: campaignName,
      subject_length: subject.length,
      body_length: body_html.length,
      scheduled_for: scheduledFor
    })

    // 4. Save to database
    const sql = getDb()

    const campaign = await sql`
      INSERT INTO admin_email_campaigns (
        campaign_name,
        campaign_type,
        subject_line,
        body_html,
        status,
        approval_status,
        target_audience,
        scheduled_for,
        created_by,
        metrics,
        created_at,
        updated_at
      ) VALUES (
        ${campaignName},
        'newsletter',
        ${subject},
        ${body_html},
        'draft',
        'pending',
        ${{ segment: 'Main Audience', source: 'gumloop' }}::jsonb,
        ${scheduledFor}::timestamptz,
        'gumloop-automation',
        ${JSON.stringify({
          instagram_insights: metadata.instagram_insights,
          strategy: metadata.strategy,
          content_type: metadata.content_type,
          generated_at: now.toISOString()
        })}::jsonb,
        NOW(),
        NOW()
      )
      RETURNING id, campaign_name, status, approval_status, scheduled_for
    `

    const createdCampaign = campaign[0]

    console.log('[Gumloop Webhook] ✅ Newsletter campaign created:', {
      id: createdCampaign.id,
      name: createdCampaign.campaign_name,
      status: createdCampaign.status,
      approval_status: createdCampaign.approval_status
    })

    // 5. Return success response
    return NextResponse.json({
      success: true,
      campaign: {
        id: createdCampaign.id,
        name: createdCampaign.campaign_name,
        status: createdCampaign.status,
        approval_status: createdCampaign.approval_status,
        scheduled_for: createdCampaign.scheduled_for,
        review_url: `/admin/newsletter-review/${createdCampaign.id}`
      },
      message: "Newsletter draft created successfully. Pending review and approval."
    }, { status: 201 })

  } catch (error) {
    console.error("[Gumloop Webhook] Error processing webhook:", error)

    return NextResponse.json({
      error: "Failed to create newsletter campaign",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * Calculate next Monday at 9:00 AM in the future
 */
function getNextMonday9am(): string {
  const now = new Date()
  const today = now.getDay() // 0 = Sunday, 1 = Monday, etc.

  // Days until next Monday (if today is Monday and it's past 9am, go to next week)
  let daysUntilMonday = (8 - today) % 7
  if (daysUntilMonday === 0 && now.getHours() >= 9) {
    daysUntilMonday = 7 // Today is Monday but past 9am, go to next Monday
  }
  if (daysUntilMonday === 0) daysUntilMonday = 7 // If today is Monday before 9am, still use today

  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  nextMonday.setHours(9, 0, 0, 0)

  return nextMonday.toISOString()
}

/**
 * Health check endpoint
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "operational",
    endpoint: "gumloop-webhook",
    purpose: "Receives AI-generated newsletter content from Gumloop",
    configured: !!process.env.GUMLOOP_WEBHOOK_SECRET
  })
}
