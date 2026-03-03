import { NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import { getAudienceContactCount } from "@/lib/resend/get-audience-contacts"

const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID!

/**
 * GET — returns current Brand Engine broadcast campaign + real Resend subscriber count.
 * No mismatch guard. Resend is the source of truth.
 */
export async function GET() {
  try {
    const sql = getDb()

    const campaignRows = await sql`
      SELECT *
      FROM admin_email_campaigns
      WHERE campaign_type = 'brand_engine_broadcast'
      ORDER BY created_at DESC
      LIMIT 1
    `
    const campaign = (campaignRows as any[])[0] ?? null

    const subscriberCount = AUDIENCE_ID
      ? await getAudienceContactCount(AUDIENCE_ID)
      : 0

    return NextResponse.json({
      success: true,
      campaign: campaign ?? null,
      subscriberCount,
    })
  } catch (error) {
    console.error("[BE Broadcast GET] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

/**
 * POST — create (or refresh) a Brand Engine broadcast draft in admin_email_campaigns.
 * Returns the upserted campaign row.
 */
export async function POST() {
  try {
    const sql = getDb()

    const subject = "Something big is coming — and I want you to be first to know 🖤"
    const previewText = "Brand Engine is opening. 12 seats. Real results."

    const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; padding: 0; background: #ffffff; font-family: 'Georgia', serif; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 48px 32px; }
  h1 { font-size: 28px; font-weight: 300; letter-spacing: 0.02em; color: #0a0a0a; margin: 0 0 32px; line-height: 1.2; }
  p { font-size: 16px; line-height: 1.8; color: #333; margin: 0 0 20px; font-family: 'Arial', sans-serif; font-weight: 300; }
  .cta { display: inline-block; background: #0a0a0a; color: #ffffff !important; padding: 16px 32px; text-decoration: none; font-family: 'Arial', sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; margin: 16px 0 32px; }
  .divider { border: none; border-top: 1px solid #e5e5e5; margin: 32px 0; }
  .footer { font-size: 11px; color: #999; font-family: 'Arial', sans-serif; line-height: 1.6; }
</style>
</head>
<body>
<div class="wrapper">
  <h1>Here's the thing about visibility...</h1>

  <p>If they can't see you, they can't pay you.</p>

  <p>I've been building something for the women in this community who are done with inconsistency. Done with showing up and getting nothing back. Done with watching other people sell online and wondering why it's not working for them.</p>

  <p>It's called <strong>Brand Engine</strong>.</p>

  <p>It's an intensive, hands-on program where I personally help you build a personal brand that actually converts — using AI, your selfies, and a strategy that fits your real life.</p>

  <p>Not theory. Not a course you start and forget. Real work, real accountability, real results.</p>

  <p>We open 12 seats. That's it. And the first cohort starts soon.</p>

  <p>If you've been following along and thinking "I need to actually do something about this" — this is the thing.</p>

  <hr class="divider">

  <p><strong>What you get:</strong></p>
  <p>→ A full personal brand system built around YOU<br>
  → AI-powered content that actually sounds like you<br>
  → Weekly coaching with me, Sandra<br>
  → A community of women who get it<br>
  → Access to SSELFIE Studio for the full program</p>

  <hr class="divider">

  <p>Investment: €2,497 (payment plans available)</p>
  <p>Seats: 12 maximum</p>

  <p>If this feels like a yes — or even a maybe — I want to talk to you first.</p>

  <a href="https://sselfie.com/apply/brand-engine" class="cta">Apply for a discovery call</a>

  <p>It's a free 30-minute call. No pressure. Just a conversation about where you are and whether this is the right fit.</p>

  <p>With love,<br>Sandra 🖤</p>

  <hr class="divider">

  <div class="footer">
    You're receiving this because you signed up for updates from SSELFIE Studio.<br>
    <a href="{{unsubscribe_url}}" style="color: #999;">Unsubscribe</a>
  </div>
</div>
</body>
</html>`.trim()

    // Upsert — delete old draft if exists, insert fresh
    await sql`
      DELETE FROM admin_email_campaigns
      WHERE campaign_type = 'brand_engine_broadcast'
        AND status IN ('draft', 'pending')
        AND approval_status IN ('draft', 'pending')
    `

    const insertedRows = await sql`
      INSERT INTO admin_email_campaigns (
        campaign_name,
        campaign_type,
        subject_line,
        preview_text,
        body_html,
        status,
        approval_status,
        target_segment,
        created_at,
        updated_at
      ) VALUES (
        ${'Brand Engine Launch — ' + new Date().toISOString().slice(0, 10)},
        ${'brand_engine_broadcast'},
        ${subject},
        ${previewText},
        ${bodyHtml},
        ${'draft'},
        ${'pending'},
        ${'all_subscribers'},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json({ success: true, campaign: (insertedRows as any[])[0] ?? null })
  } catch (error) {
    console.error("[BE Broadcast POST] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
