/**
 * Blueprint Follow-Up Workflow
 * 3-day email sequence triggered after Blueprint PDF delivery
 *
 * Day 0: PDF Delivery Email (handled by email-concepts route)
 * Day 1: Value Expansion Email
 * Day 2: Invitation Email
 *
 * All emails use serif typography and clean editorial aesthetic
 */

import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY)

interface FollowUpEmailOptions {
  subscriberId: number
  email: string
  name: string
  step: 0 | 1 | 2
}

/**
 * Send Day 1 - Value Expansion Email
 * Teaches one Blueprint concept and connects to SSELFIE Studio value
 */
async function sendDay1ValueEmail(options: FollowUpEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: "SSELFIE <hello@sselfie.ai>",
      to: options.email,
      subject: `${options.name}, here's the #1 strategy from your Blueprint`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Times New Roman', serif; color: #292524; background-color: #fafaf9; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; background: white; }
              h1 { font-size: 28px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 20px; }
              p { font-size: 14px; line-height: 1.7; color: #57534e; margin-bottom: 16px; }
              .highlight-box { background: #fafaf9; padding: 25px; border-left: 4px solid #292524; margin: 30px 0; border-radius: 6px; }
              .strategy-title { font-size: 18px; font-weight: 500; color: #292524; margin-bottom: 12px; }
              .cta { background: #292524; color: white; padding: 14px 28px; text-align: center; text-decoration: none; display: inline-block; margin-top: 25px; border-radius: 4px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>YOUR BLUEPRINT IN ACTION</h1>
              
              <p>Hi ${options.name},</p>
              
              <p>Yesterday you received your complete Brand Blueprint. Today, let's talk about the most important piece: <strong>consistency over perfection</strong>.</p>
              
              <div class="highlight-box">
                <div class="strategy-title">The 3-Pillar System</div>
                <p style="margin-bottom: 10px;">Your Blueprint revealed your unique messaging pillars. These aren't random topics - they're strategic anchors that build authority.</p>
                <p style="margin-bottom: 10px;"><strong>Most people fail because:</strong> They post whatever feels right that day. No strategy. No consistency.</p>
                <p style="margin-bottom: 0;"><strong>You'll succeed because:</strong> Your Blueprint gives you a framework. Every post reinforces one of your pillars.</p>
              </div>
              
              <p>This is exactly how SSELFIE Studio works - it takes your strategic pillars and helps you create content that stays on-brand, on-message, and on-strategy.</p>
              
              <p>Maya (our AI brand strategist) remembers your Blueprint and uses it to guide every piece of content you create. No more "what should I post today?" moments.</p>
              
              <p style="margin-top: 30px; color: #a8a29e; font-size: 13px;">Tomorrow: I'll show you how to turn your Blueprint into a living, breathing content system.</p>
              
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/beta?src=followup_1" class="cta" style="color: white;">Explore SSELFIE Studio</a>
            </div>
          </body>
        </html>
      `,
    })

    if (error) {
      throw error
    }

    // Update database
    await sql`
      UPDATE blueprint_subscribers
      SET followup_1_sent_at = NOW()
      WHERE id = ${options.subscriberId}
    `

    console.log(`[BlueprintFollowUp] Day 1 email sent to ${options.email}`)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error("[BlueprintFollowUp] Day 1 email failed:", error)
    return { success: false, error }
  }
}

/**
 * Send Day 2 - Invitation Email
 * Invites user to explore SSELFIE Studio with clear CTA
 */
async function sendDay2InvitationEmail(options: FollowUpEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: "SSELFIE <hello@sselfie.ai>",
      to: options.email,
      subject: `${options.name}, ready to bring your Blueprint to life?`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Times New Roman', serif; color: #292524; background-color: #fafaf9; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; background: white; }
              h1 { font-size: 28px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 20px; }
              p { font-size: 14px; line-height: 1.7; color: #57534e; margin-bottom: 16px; }
              .feature-box { background: #fafaf9; padding: 20px; margin: 15px 0; border-radius: 6px; }
              .feature-title { font-size: 14px; font-weight: 600; color: #292524; margin-bottom: 6px; text-transform: uppercase; }
              .cta-box { background: #292524; color: white; padding: 35px 25px; text-align: center; border-radius: 8px; margin: 35px 0; }
              .cta { background: #78716c; color: white; padding: 16px 32px; text-align: center; text-decoration: none; display: inline-block; margin-top: 20px; border-radius: 4px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>YOUR INVITATION</h1>
              
              <p>Hi ${options.name},</p>
              
              <p>Over the last 2 days, you've seen what's possible with your Brand Blueprint. Now it's time to implement it.</p>
              
              <p><strong>SSELFIE Studio</strong> is where your Blueprint becomes your daily content system:</p>
              
              <div class="feature-box">
                <div class="feature-title">AI-Powered Photoshoots</div>
                <p style="font-size: 13px; color: #57534e; margin: 0;">Generate professional brand photos that match your visual strategy - no photographer needed.</p>
              </div>
              
              <div class="feature-box">
                <div class="feature-title">Strategic Feed Planning</div>
                <p style="font-size: 13px; color: #57534e; margin: 0;">Maya plans your entire month based on your messaging pillars and content calendar.</p>
              </div>
              
              <div class="feature-box">
                <div class="feature-title">Blueprint-Guided Content</div>
                <p style="font-size: 13px; color: #57534e; margin: 0;">Every caption, every image, every post reinforces your strategic positioning.</p>
              </div>
              
              <div class="cta-box">
                <h2 style="margin: 0 0 15px; border: none; color: white; font-size: 20px; font-weight: 300; letter-spacing: 0.1em;">Ready to build your brand?</h2>
                <p style="color: white; margin: 0 0 10px; font-size: 13px;">Your Blueprint is the foundation. SSELFIE Studio is how you build on it.</p>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/beta?src=followup_2" class="cta" style="color: white;">Start Your Free Trial</a>
              </div>
              
              <p style="margin-top: 35px; font-size: 12px; color: #a8a29e; text-align: center;">
                Questions? Just reply to this email.
              </p>
            </div>
          </body>
        </html>
      `,
    })

    if (error) {
      throw error
    }

    // Update database
    await sql`
      UPDATE blueprint_subscribers
      SET followup_2_sent_at = NOW()
      WHERE id = ${options.subscriberId}
    `

    console.log(`[BlueprintFollowUp] Day 2 email sent to ${options.email}`)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error("[BlueprintFollowUp] Day 2 email failed:", error)
    return { success: false, error }
  }
}

/**
 * Start Blueprint Follow-Up Workflow
 * Triggers the 3-day sequence for a subscriber
 */
export async function startBlueprintFollowUpWorkflow(subscriberId: number, email: string, name: string) {
  try {
    console.log(`[BlueprintFollowUp] Starting workflow for subscriber ${subscriberId}`)

    // Day 1: Schedule for 24 hours after PDF delivery
    setTimeout(
      async () => {
        await sendDay1ValueEmail({ subscriberId, email, name, step: 1 })
      },
      24 * 60 * 60 * 1000,
    ) // 24 hours

    // Day 2: Schedule for 48 hours after PDF delivery
    setTimeout(
      async () => {
        await sendDay2InvitationEmail({ subscriberId, email, name, step: 2 })
      },
      48 * 60 * 60 * 1000,
    ) // 48 hours

    return { success: true }
  } catch (error) {
    console.error("[BlueprintFollowUp] Workflow start failed:", error)
    return { success: false, error }
  }
}
