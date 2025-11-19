import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface EmailTemplate {
  subject: string
  previewText: string
  htmlContent: string
}

export async function generateEmailHTML(params: {
  greeting: string
  hookText: string
  mainContent: string
  ctaText: string
  ctaUrl: string
  psText?: string
}): Promise<string> {
  const { greeting, hookText, mainContent, ctaText, ctaUrl, psText } = params
  
  // Simple, clean HTML template matching Sandra's style
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSELFIE Studio</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafafa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="padding: 40px 40px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">SSELFIE Studio</h1>
    </div>
    
    <!-- Body -->
    <div style="padding: 20px 40px 40px;">
      
      <!-- Greeting -->
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
        ${greeting}
      </p>
      
      <!-- Hook -->
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
        ${hookText}
      </p>
      
      <!-- Main Content -->
      <div style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #333333;">
        ${mainContent}
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="${ctaUrl}" style="display: inline-block; padding: 16px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          ${ctaText}
        </a>
      </div>
      
      ${psText ? `
      <!-- PS -->
      <p style="margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 14px; line-height: 1.6; color: #666666; font-style: italic;">
        <strong>P.S.</strong> ${psText}
      </p>
      ` : ''}
      
      <!-- Signature -->
      <p style="margin: 30px 0 0; font-size: 16px; line-height: 1.6; color: #333333;">
        Keep creating,<br>
        <strong>Sandra</strong><br>
        <span style="color: #666666; font-size: 14px;">Founder, SSELFIE Studio</span>
      </p>
      
    </div>
    
    <!-- Footer -->
    <div style="padding: 30px 40px; background-color: #f9f9f9; border-top: 1px solid #eeeeee;">
      <p style="margin: 0 0 10px; font-size: 12px; line-height: 1.5; color: #999999; text-align: center;">
        You're receiving this because you're part of the SSELFIE community.
      </p>
      <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #999999; text-align: center;">
        <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #999999; text-decoration: underline;">Unsubscribe</a>
      </p>
    </div>
    
  </div>
</body>
</html>
  `.trim()
}

export async function saveEmailCampaign(params: {
  campaignName: string
  campaignType: string
  subjectLine: string
  emailContent: string
  targetSegment: string
  resendBroadcastId?: string
  status?: string
}) {
  const {
    campaignName,
    campaignType,
    subjectLine,
    emailContent,
    targetSegment,
    resendBroadcastId,
    status = 'draft'
  } = params
  
  const result = await sql`
    INSERT INTO admin_email_campaigns (
      campaign_name,
      campaign_type,
      subject_line,
      email_content,
      resend_broadcast_id,
      target_segment,
      status,
      created_at,
      updated_at
    ) VALUES (
      ${campaignName},
      ${campaignType},
      ${subjectLine},
      ${emailContent},
      ${resendBroadcastId || null},
      ${targetSegment},
      ${status},
      NOW(),
      NOW()
    )
    RETURNING id
  `
  
  return result[0].id
}
