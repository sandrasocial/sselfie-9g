import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"

/**
 * Convert HTML to plain text by stripping tags
 */
function htmlToPlainText(html: string): string {
  return html
    // Remove script and style tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Replace <br> and </p> with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up extra whitespace
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
}

/**
 * Gumloop Webhook Handler
 *
 * Receives AI-generated newsletter content from Gumloop flow and saves to database
 * for review and approval before sending.
 *
 * Accepts two payload formats:
 *
 * Format 1 (Simple):
 * {
 *   subject: string,           // Email subject line
 *   body_html: string,          // Email body (HTML)
 *   metadata?: {...}            // Optional metadata
 * }
 *
 * Format 2 (Content Writer Agent):
 * {
 *   subject_options: string[], // Array of subject line options
 *   body_html: string,          // Email body (HTML)
 *   body_text?: string,         // Plain text version (optional)
 *   offer_mentioned?: string,   // Which offer was mentioned
 *   cta?: string,               // Call to action text
 *   strategy_used?: string,     // Strategy description
 *   metadata?: {...}            // Optional metadata
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

    // Handle both simple format and Content Writer agent format
    let subject: string
    let body_html: string
    let metadata: any = {}

    if (payload.subject_options && Array.isArray(payload.subject_options)) {
      // Gumloop Content Writer format
      subject = payload.subject_options[0] || 'Newsletter'
      body_html = payload.body_html
      metadata = {
        subject_options: payload.subject_options,
        offer_mentioned: payload.offer_mentioned,
        cta: payload.cta,
        strategy_used: payload.strategy_used,
        ...payload.metadata
      }
    } else {
      // Simple format
      subject = payload.subject
      body_html = payload.body_html
      metadata = payload.metadata || {}
    }

    if (!subject || !body_html) {
      console.error('[Gumloop Webhook] Missing required fields:', { subject: !!subject, body_html: !!body_html, payload })
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["subject or subject_options", "body_html"],
          received: Object.keys(payload)
        },
        { status: 400 }
      )
    }

    // 3. Prepare campaign data
    const now = new Date()
    const defaultName = `Weekly Newsletter - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    const campaignName = metadata.campaign_name || defaultName

    // Default to next Monday at 9am if not specified
    const scheduledFor = metadata.scheduled_for || getNextMonday9am()

    // Convert HTML to plain text
    const body_text = htmlToPlainText(body_html)

    console.log('[Gumloop Webhook] Creating newsletter campaign:', {
      name: campaignName,
      subject_length: subject.length,
      body_length: body_html.length,
      body_text_length: body_text.length,
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
        body_text,
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
        ${body_text},
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
