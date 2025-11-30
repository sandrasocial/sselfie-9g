/**
 * Email Automation System
 * All 8 email automations for SSELFIE Studio
 * Uses Maya's voice and brand tone
 */

import { neon } from "@neondatabase/serverless"
import { sendEmail } from "./send"
import { scheduleEmail } from "./queue"
import {
  brandBlueprintEmail,
  welcomeEmail1,
  welcomeEmail2,
  welcomeEmail3,
  welcomeEmail4,
  welcomeEmail5,
  stripHtmlToText,
} from "./templates/maya-html"
import {
  subscriptionConfirmationEmail,
  paymentFailedEmail,
  subscriptionCancelledEmail,
} from "./templates/billing"

const sql = neon(process.env.DATABASE_URL!)

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

/**
 * AUTOMATION 1: Brand Blueprint Delivery Email
 * Triggered immediately when user downloads any freebie
 */
export async function sendBrandBlueprintEmail(options: {
  email: string
  firstName?: string
  blueprintUrl: string
  userId?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const html = brandBlueprintEmail({
      firstName: options.firstName,
      blueprintUrl: options.blueprintUrl,
      studioUrl: `${SITE_URL}/studio`,
    })

    const result = await sendEmail({
      to: options.email,
      subject: "Your Brand Blueprint is Ready",
      html,
      text: stripHtmlToText(html),
      emailType: "brand-blueprint",
      userId: options.userId,
      tags: ["blueprint", "automated"],
    })

    return {
      success: result.success,
      error: result.error,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * AUTOMATION 2: Welcome Sequence (5 Emails)
 * Triggered on new signup or subscription
 */
export async function startWelcomeSequence(options: {
  email: string
  firstName?: string
  userId: string
}): Promise<{ success: boolean; scheduled: number; errors: string[] }> {
  const errors: string[] = []
  let scheduled = 0

  const now = new Date()
  const delays = [0, 1, 2, 4, 7] // Days between emails

  const emails = [
    {
      subject: "Welcome to SSELFIE Studio",
      html: welcomeEmail1({ firstName: options.firstName }),
    },
    {
      subject: "Your Future Self Vision",
      html: welcomeEmail2({ firstName: options.firstName }),
    },
    {
      subject: "The 5 SSELFIE Brand Styles",
      html: welcomeEmail3({ firstName: options.firstName }),
    },
    {
      subject: "Why Photos = Authority",
      html: welcomeEmail4({ firstName: options.firstName }),
    },
    {
      subject: "Start Your Studio Journey",
      html: welcomeEmail5({
        firstName: options.firstName,
        studioUrl: `${SITE_URL}/studio`,
      }),
    },
  ]

  for (let i = 0; i < emails.length; i++) {
    const scheduledFor = new Date(now.getTime() + delays[i] * 24 * 60 * 60 * 1000)

    const result = await scheduleEmail({
      userId: options.userId,
      email: options.email,
      subject: emails[i].subject,
      html: emails[i].html,
      scheduledFor,
      emailType: "welcome-sequence",
      metadata: { step: i + 1, total: emails.length },
    })

    if (result.success) {
      scheduled++
    } else {
      errors.push(`Email ${i + 1}: ${result.error}`)
    }
  }

  return {
    success: errors.length === 0,
    scheduled,
    errors,
  }
}

/**
 * AUTOMATION 3: Weekly Newsletter Automation
 * Uses Maya to generate newsletter content
 * Triggered by cron job
 */
export async function generateAndSendWeeklyNewsletter(): Promise<{
  success: boolean
  sent: number
  error?: string
}> {
  try {
    // Get all active subscribers
    const subscribers = await sql`
      SELECT DISTINCT email, name
      FROM (
        SELECT email, name FROM freebie_subscribers WHERE email IS NOT NULL
        UNION
        SELECT email, name FROM blueprint_subscribers WHERE email IS NOT NULL
        UNION
        SELECT email, first_name as name FROM users WHERE email IS NOT NULL
      ) AS all_subscribers
      WHERE email IS NOT NULL
      LIMIT 1000
    `

    if (subscribers.length === 0) {
      return { success: false, sent: 0, error: "No subscribers found" }
    }

    // TODO: Integrate with Maya to generate newsletter content
    // For now, use a template
    const newsletterHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px; }
            h1 { font-size: 32px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase; }
            p { font-size: 16px; line-height: 1.7; color: #292524; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>SSELFIE</h1>
            <p>Hi there,</p>
            <p>This week's trend: Minimalist luxury is back. Think clean lines, neutral tones, effortless elegance.</p>
            <p>Style edit: Try pairing a simple white button-down with statement jewelry. It's the perfect balance of classic and bold.</p>
            <p>Instagram growth tip: Consistency beats perfection. Post 3-4 times per week with on-brand content, and watch your engagement grow.</p>
            <p>XoXo,<br>Maya</p>
          </div>
        </body>
      </html>
    `

    // Send to all subscribers
    const results = await sendEmail({
      to: subscribers.map((s) => s.email),
      subject: "This Week's Style Edit",
      html: newsletterHtml,
      text: stripHtmlToText(newsletterHtml),
      emailType: "weekly-newsletter",
      tags: ["newsletter", "weekly"],
    })

    return {
      success: results.success,
      sent: subscribers.length,
      error: results.error,
    }
  } catch (error) {
    return {
      success: false,
      sent: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * AUTOMATION 4: Sales Funnel (7-Day Nurture)
 * Triggered on freebie download or Maya interaction
 */
export async function startSalesFunnelSequence(options: {
  email: string
  firstName?: string
  userId: string
  trigger: "freebie" | "maya-interaction"
}): Promise<{ success: boolean; scheduled: number; errors: string[] }> {
  const errors: string[] = []
  let scheduled = 0

  const now = new Date()
  const delays = [0, 1, 2, 3, 4, 5, 6] // Days

  // TODO: Generate personalized content with Maya
  const emails = [
    {
      subject: "Your brand identity",
      html: `<p>Hi ${options.firstName || "there"},</p><p>Let's talk about your brand identity...</p><p>XoXo,<br>Maya</p>`,
    },
    {
      subject: "Your future-self aesthetic",
      html: `<p>Hi ${options.firstName || "there"},</p><p>What does your future self look like?...</p><p>XoXo,<br>Maya</p>`,
    },
    // ... more emails
  ]

  for (let i = 0; i < emails.length; i++) {
    const scheduledFor = new Date(now.getTime() + delays[i] * 24 * 60 * 60 * 1000)

    const result = await scheduleEmail({
      userId: options.userId,
      email: options.email,
      subject: emails[i].subject,
      html: emails[i].html,
      scheduledFor,
      emailType: "sales-funnel",
      metadata: { step: i + 1, trigger: options.trigger },
    })

    if (result.success) {
      scheduled++
    } else {
      errors.push(`Email ${i + 1}: ${result.error}`)
    }
  }

  return {
    success: errors.length === 0,
    scheduled,
    errors,
  }
}

/**
 * AUTOMATION 5: Studio Onboarding Sequence
 * Triggered on subscription purchase
 */
export async function startStudioOnboardingSequence(options: {
  email: string
  firstName?: string
  userId: string
}): Promise<{ success: boolean; scheduled: number; errors: string[] }> {
  const errors: string[] = []
  let scheduled = 0

  const now = new Date()
  const delays = [0, 1, 2, 3, 4] // Days

  const emails = [
    {
      subject: "Welcome to SSELFIE Studio + Maya Setup",
      html: `<p>Hi ${options.firstName || "there"},</p><p>Welcome! Let's get you set up with Maya...</p><p>XoXo,<br>Maya</p>`,
    },
    {
      subject: "Upload your 20 selfies",
      html: `<p>Hi ${options.firstName || "there"},</p><p>Ready to train your AI model? Upload 20 selfies...</p><p>XoXo,<br>Maya</p>`,
    },
    // ... more emails
  ]

  for (let i = 0; i < emails.length; i++) {
    const scheduledFor = new Date(now.getTime() + delays[i] * 24 * 60 * 60 * 1000)

    const result = await scheduleEmail({
      userId: options.userId,
      email: options.email,
      subject: emails[i].subject,
      html: emails[i].html,
      scheduledFor,
      emailType: "studio-onboarding",
      metadata: { step: i + 1 },
    })

    if (result.success) {
      scheduled++
    } else {
      errors.push(`Email ${i + 1}: ${result.error}`)
    }
  }

  return {
    success: errors.length === 0,
    scheduled,
    errors,
  }
}

/**
 * AUTOMATION 6: Billing / Transactional Emails
 * Sends billing-related emails for subscription events
 */
export async function sendBillingEmail(
  type: "payment_success" | "payment_failed" | "subscription_started" | "subscription_canceled",
  userId: string,
  options?: {
    email?: string
    firstName?: string
    productName?: string
    amount?: number
    billingPeriod?: "month" | "year"
    retryUrl?: string
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user email if not provided
    let email = options?.email
    let firstName = options?.firstName

    if (!email || !firstName) {
      const userResult = await sql`
        SELECT email, first_name
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `
      if (userResult && userResult.length > 0) {
        email = email || userResult[0].email
        firstName = firstName || userResult[0].first_name
      }
    }

    if (!email) {
      return {
        success: false,
        error: "User email not found",
      }
    }

    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
    const productName = options?.productName || "SSELFIE Studio"
    let html: string
    let subject: string

    switch (type) {
      case "payment_success":
      case "subscription_started":
        html = subscriptionConfirmationEmail({
          firstName,
          productName,
          amount: options?.amount || 0,
          billingPeriod: options?.billingPeriod || "month",
        })
        subject = type === "payment_success" ? "Payment Successful" : "Welcome to SSELFIE Studio"
        break

      case "payment_failed":
        html = paymentFailedEmail({
          firstName,
          productName,
          retryUrl: options?.retryUrl || `${SITE_URL}/checkout`,
        })
        subject = "Payment Failed - Action Required"
        break

      case "subscription_canceled":
        html = subscriptionCancelledEmail({
          firstName,
          productName,
        })
        subject = "Subscription Cancelled"
        break

      default:
        return {
          success: false,
          error: `Invalid billing email type: ${type}`,
        }
    }

    const result = await sendEmail({
      to: email,
      subject,
      html,
      text: stripHtmlToText(html),
      emailType: `billing-${type}`,
      userId,
      tags: ["billing", "transactional", type],
    })

    return {
      success: result.success,
      error: result.error,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * AUTOMATION 7: Brand Blueprint Rewrite + Send
 * When user completes brand wizard
 */
export async function sendRewrittenBlueprintEmail(options: {
  email: string
  firstName?: string
  blueprintData: any
  userId?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Use Maya to rewrite blueprint
    const html = brandBlueprintEmail({
      firstName: options.firstName,
      blueprintUrl: `${SITE_URL}/blueprint/view`,
      studioUrl: `${SITE_URL}/studio`,
    })

    const result = await sendEmail({
      to: options.email,
      subject: "Your Brand Blueprint (Rewritten by Maya)",
      html,
      text: stripHtmlToText(html),
      emailType: "blueprint-rewrite",
      userId: options.userId,
      tags: ["blueprint", "maya-rewrite"],
    })

    return {
      success: result.success,
      error: result.error,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * AUTOMATION 8: Maya "Future Self Vision" Series
 * 3-email emotional identity series
 */
export async function startFutureSelfVisionSeries(options: {
  email: string
  firstName?: string
  userId: string
}): Promise<{ success: boolean; scheduled: number; errors: string[] }> {
  const errors: string[] = []
  let scheduled = 0

  const now = new Date()
  const delays = [0, 3, 7] // Days

  const emails = [
    {
      subject: "See yourself as she sees you",
      html: `<p>Hi ${options.firstName || "there"},</p><p>Let me show you how I see you...</p><p>XoXo,<br>Maya</p>`,
    },
    {
      subject: "You are building your future self",
      html: `<p>Hi ${options.firstName || "there"},</p><p>Every photo is a step toward your future self...</p><p>XoXo,<br>Maya</p>`,
    },
    {
      subject: "Your story matters",
      html: `<p>Hi ${options.firstName || "there"},</p><p>Your story is powerful. Let's tell it...</p><p>XoXo,<br>Maya</p>`,
    },
  ]

  for (let i = 0; i < emails.length; i++) {
    const scheduledFor = new Date(now.getTime() + delays[i] * 24 * 60 * 60 * 1000)

    const result = await scheduleEmail({
      userId: options.userId,
      email: options.email,
      subject: emails[i].subject,
      html: emails[i].html,
      scheduledFor,
      emailType: "future-self-vision",
      metadata: { step: i + 1 },
    })

    if (result.success) {
      scheduled++
    } else {
      errors.push(`Email ${i + 1}: ${result.error}`)
    }
  }

  return {
    success: errors.length === 0,
    scheduled,
    errors,
  }
}

