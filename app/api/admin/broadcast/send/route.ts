import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY)

// Helper to strip HTML for plain text version
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      segmentId, 
      subjectLine, 
      emailHtml, 
      campaignName,
      scheduledAt, 
      sendTestFirst 
    } = body

    // Validate required fields
    if (!segmentId || !subjectLine || !emailHtml || !campaignName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: segmentId, subjectLine, emailHtml, campaignName' },
        { status: 400 }
      )
    }

    if (!resend) {
      return NextResponse.json(
        { success: false, error: 'Resend client not initialized. RESEND_API_KEY not configured.' },
        { status: 500 }
      )
    }

    // Validate unsubscribe link
    let finalEmailHtml = emailHtml
    if (!emailHtml.includes('RESEND_UNSUBSCRIBE_URL') && !emailHtml.includes('{{{RESEND_UNSUBSCRIBE_URL}}}')) {
      console.warn('⚠️ Email missing unsubscribe link - adding it')
      finalEmailHtml += '\n\n<p style="text-align: center; font-size: 12px; color: #666;"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p>'
    }

    // Send test email if requested
    if (sendTestFirst) {
      try {
        await resend.emails.send({
          from: 'Sandra from SSELFIE <hello@sselfie.ai>',
          to: 'hello@sselfie.ai',
          subject: `[TEST] ${subjectLine}`,
          html: finalEmailHtml,
          tags: [
            { name: 'type', value: 'test' },
            { name: 'environment', value: process.env.NODE_ENV || 'unknown' }
          ],
          tracking_opens: false,
          tracking_clicks: false,
        })
        console.log('✅ Test email sent to Sandra')
      } catch (testError: any) {
        console.error('❌ Test email failed:', testError)
        return NextResponse.json(
          { 
            success: false, 
            error: 'Test email failed',
            details: testError.message || 'Could not send test email'
          },
          { status: 500 }
        )
      }
    }

    // Create broadcast
    // CRITICAL: Resend API requires segmentId parameter for segment broadcasts
    console.log('📝 Creating broadcast with segmentId:', segmentId)
    const broadcast = await resend.broadcasts.create({
      segmentId: segmentId,  // Resend API expects segmentId parameter
      from: 'Sandra from SSELFIE <hello@sselfie.ai>',
      subject: subjectLine,
      html: finalEmailHtml
    })

    if (broadcast.error) {
      return NextResponse.json(
        { 
          success: false, 
          error: broadcast.error.message || 'Failed to create broadcast',
          details: broadcast.error
        },
        { status: 500 }
      )
    }

    const broadcastId = broadcast.data?.id
    if (!broadcastId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Broadcast created but no ID returned from Resend'
        },
        { status: 500 }
      )
    }

    // Send broadcast (immediate or scheduled)
    const sendParams = scheduledAt && scheduledAt !== 'now' 
      ? { scheduledAt: scheduledAt }
      : {}

    const sendResult = await resend.broadcasts.send(broadcastId, sendParams)

    if (sendResult.error) {
      return NextResponse.json(
        { 
          success: false, 
          error: sendResult.error.message || 'Failed to send broadcast',
          broadcastId,
          resendUrl: `https://resend.com/broadcasts/${broadcastId}`,
          note: 'You can manually send this broadcast from the Resend dashboard using the URL above.'
        },
        { status: 500 }
      )
    }

    // Save to database
    const status = scheduledAt && scheduledAt !== 'now' ? 'scheduled' : 'sent'
    const scheduledForDb = scheduledAt && scheduledAt !== 'now' ? scheduledAt : null
    const bodyText = stripHtml(finalEmailHtml)

    try {
      await sql`
        INSERT INTO admin_email_campaigns (
          campaign_name, campaign_type, subject_line,
          body_html, body_text, status, resend_broadcast_id,
          target_audience, scheduled_for,
          created_by, created_at, updated_at
        ) VALUES (
          ${campaignName}, 'broadcast', ${subjectLine},
          ${finalEmailHtml}, ${bodyText}, ${status}, ${broadcastId},
          ${JSON.stringify({ resend_segment_id: segmentId })}::jsonb,
          ${scheduledForDb},
          'hello@sselfie.ai', NOW(), NOW()
        )
      `
    } catch (dbError: any) {
      console.error('Failed to save campaign to database:', dbError)
      // Don't fail the whole request if DB save fails - broadcast was already sent
    }

    return NextResponse.json({
      success: true,
      campaignId: broadcastId, // Use broadcastId as fallback if DB insert failed
      broadcastId,
      status,
      resendUrl: `https://resend.com/broadcasts/${broadcastId}`,
      message: scheduledAt && scheduledAt !== 'now'
        ? `✅ Campaign scheduled for ${scheduledAt}! Broadcast will be sent automatically.`
        : '✅ Campaign sent immediately! Check Resend dashboard for delivery status.'
    })

  } catch (error: any) {
    console.error('Unexpected error in broadcast send:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

