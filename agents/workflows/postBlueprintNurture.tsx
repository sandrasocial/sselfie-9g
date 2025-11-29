import { sendEmail } from "@/lib/email/resend"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Post-Blueprint Nurture Workflow
 * Sends automated nurture emails based on subscriber stage
 *
 * IMPORTANT: This workflow is triggered by AdminSupervisorAgent
 * after a subscriber's nurture_stage changes
 *
 * @param input - Workflow input with email and newStage
 * @returns Workflow result with status and stage
 */
export async function runWorkflow(input: any) {
  const { email, newStage, subscriberId } = input

  try {
    console.log(`[PostBlueprintNurture] Running workflow for ${email} (stage: ${newStage})`)

    if (newStage === "cold") {
      console.log(`[PostBlueprintNurture] ${email} is cold - no action taken`)
      return { status: "no_action_low_intent", stage: newStage }
    }

    const subscribers = await sql`
      SELECT id, email, name, form_data, behavior_score
      FROM blueprint_subscribers
      WHERE email = ${email}
      LIMIT 1
    `

    if (subscribers.length === 0) {
      throw new Error("Subscriber not found")
    }

    const subscriber = subscribers[0]

    if (newStage === "warm") {
      console.log(`[PostBlueprintNurture] Sending warm sequence to ${email}`)

      // Email 1: You're closer than you think
      await sendEmail({
        to: email,
        subject: `${subscriber.name ? subscriber.name + ", " : ""}You're closer than you think`,
        html: generateWarmEmail1(subscriber),
      })

      // Wait 48 hours before Email 2
      await scheduleEmail({
        email,
        subject: "The moment your brand starts transforming",
        html: generateWarmEmail2(subscriber),
        delayHours: 48,
      })

      // Update last_email_sent_at
      await sql`
        UPDATE blueprint_subscribers
        SET last_email_sent_at = NOW()
        WHERE id = ${subscriber.id}
      `

      return { status: "warm_sequence_sent", stage: newStage }
    }

    if (newStage === "hot") {
      console.log(`[PostBlueprintNurture] Sending hot email to ${email}`)

      await sendEmail({
        to: email,
        subject: `${subscriber.name ? subscriber.name + ", " : ""}You're ready — here's your next step`,
        html: generateHotEmail(subscriber),
      })

      // Update last_email_sent_at
      await sql`
        UPDATE blueprint_subscribers
        SET last_email_sent_at = NOW()
        WHERE id = ${subscriber.id}
      `

      return { status: "hot_email_sent", stage: newStage }
    }

    return { status: "unknown_stage", stage: newStage }
  } catch (error) {
    console.error("[PostBlueprintNurture] Workflow error:", error)
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Schedules an email to be sent after a delay
 */
async function scheduleEmail(data: { email: string; subject: string; html: string; delayHours: number }) {
  const scheduledFor = new Date()
  scheduledFor.setHours(scheduledFor.getHours() + data.delayHours)

  await sql`
    INSERT INTO marketing_email_queue (email, subject, html, scheduled_for, status, created_at)
    VALUES (${data.email}, ${data.subject}, ${data.html}, ${scheduledFor.toISOString()}, 'pending', NOW())
  `

  console.log(`[PostBlueprintNurture] Email scheduled for ${data.email} at ${scheduledFor.toISOString()}`)
}

/**
 * Generate Warm Email 1: You're closer than you think
 */
function generateWarmEmail1(subscriber: any): string {
  const name = subscriber.name || "there"
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Times New Roman', serif; color: #292524; background-color: #fafaf9; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; background: white; }
          h1 { font-size: 28px; font-weight: 300; margin-bottom: 20px; }
          p { font-size: 14px; color: #57534e; margin-bottom: 16px; }
          .signature { margin-top: 30px; font-style: italic; color: #78716c; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>You're closer than you think</h1>
          <p>Hi ${name},</p>
          <p>Your Blueprint shows exactly what you're capable of creating. And the truth is, the gap between where you are now and where you want to be is smaller than it feels.</p>
          <p>Most people overthink this. They wait for the perfect moment, the perfect setup, the perfect confidence. But the magic starts when you take the first step with what you already have.</p>
          <p>Your Blueprint isn't just ideas—it's a roadmap. You already know your dream client. You already know what they're struggling with. You already have the foundation of a magnetic brand.</p>
          <p>What comes next is simple: implement.</p>
          <p>Reply to this email if you want to talk through your next steps. I'm here.</p>
          <div class="signature">
            <p>Sandra<br/>Founder, SSELFIE</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Generate Warm Email 2: The moment your brand starts transforming
 */
function generateWarmEmail2(subscriber: any): string {
  const name = subscriber.name || "there"
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Times New Roman', serif; color: #292524; background-color: #fafaf9; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; background: white; }
          h1 { font-size: 28px; font-weight: 300; margin-bottom: 20px; }
          p { font-size: 14px; color: #57534e; margin-bottom: 16px; }
          .cta { background: #292524; color: white; padding: 14px 28px; text-align: center; text-decoration: none; display: inline-block; margin-top: 20px; border-radius: 4px; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; }
          .signature { margin-top: 30px; font-style: italic; color: #78716c; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>The moment your brand starts transforming</h1>
          <p>Hi ${name},</p>
          <p>There's a moment that happens when you start showing up consistently with your brand. It's subtle at first—a comment here, a DM there. But then it builds.</p>
          <p>People start recognizing you. They remember your posts. They think of you when they need help with what you do. That's when everything shifts.</p>
          <p>Your Blueprint gave you the strategy. SSELFIE Studio makes it automatic—content, visuals, captions, all aligned with your brand, ready to post.</p>
          <p>No more staring at a blank screen. No more "what should I post today?" moments. Just consistent, strategic content that brings in your dream clients.</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/beta" class="cta" style="color: white;">See how SSELFIE Studio works</a>
          <div class="signature">
            <p>Sandra<br/>Founder, SSELFIE</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Generate Hot Email: You're ready — here's your next step
 */
function generateHotEmail(subscriber: any): string {
  const name = subscriber.name || "there"
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Times New Roman', serif; color: #292524; background-color: #fafaf9; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; background: white; }
          h1 { font-size: 28px; font-weight: 300; margin-bottom: 20px; }
          p { font-size: 14px; color: #57534e; margin-bottom: 16px; }
          .cta-box { background: #292524; color: white; padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0; }
          .cta { background: #78716c; color: white; padding: 16px 32px; text-align: center; text-decoration: none; display: inline-block; margin-top: 20px; border-radius: 4px; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; }
          .signature { margin-top: 30px; font-style: italic; color: #78716c; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>You're ready — here's your next step</h1>
          <p>Hi ${name},</p>
          <p>You've done the hardest part: you got clear on your brand, your dream client, and your strategy. That clarity is everything.</p>
          <p>Most people never get this far. But you did.</p>
          <p>Now it's time to activate it. SSELFIE Studio takes your Blueprint and turns it into real, strategic content—automatically. No guesswork. No blank-screen moments. Just your brand, showing up consistently and powerfully.</p>
          <div class="cta-box">
            <h2 style="margin-top: 0; font-size: 22px; color: white;">Ready to bring your brand to life?</h2>
            <p style="color: white; margin-bottom: 0;">SSELFIE Studio generates content aligned with your strategy, creates branded visuals, and plans your entire feed—so you can focus on what you do best.</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/beta" class="cta" style="color: white;">Activate SSELFIE Studio</a>
          </div>
          <p>Questions? Just hit reply—I'm here.</p>
          <div class="signature">
            <p>Sandra<br/>Founder, SSELFIE</p>
          </div>
        </div>
      </body>
    </html>
  `
}
