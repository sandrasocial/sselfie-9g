/**
 * Newsletter Workflow
 *
 * Purpose: Automates bi-weekly newsletter generation and sending
 * - Checks if 14 days have passed since last newsletter
 * - Generates newsletter content using AI (3 sections)
 * - Sends to all newsletter_subscribers segment
 * - Logs events for tracking
 *
 * Triggered by: AdminSupervisorAgent manually or via scheduled check
 * Used by: MarketingAutomationAgent
 */

import { audienceTools } from "../tools/audienceTools"
import { scheduleEmail, logEmailEvent } from "../marketing/marketingAutomationAgent"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface WorkflowInput {
  userId: string
  context?: any
}

export interface WorkflowOutput {
  status: "completed" | "skipped" | "error"
  debug?: any
}

export async function runWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  console.log("[NewsletterWorkflow] Starting newsletter workflow...")

  try {
    const lastNewsletterCheck = await sql`
      SELECT created_at
      FROM marketing_email_queue
      WHERE email LIKE '%newsletter%'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (lastNewsletterCheck.length > 0) {
      const lastSent = new Date(lastNewsletterCheck[0].created_at)
      const daysSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSince < 14) {
        console.log(`[NewsletterWorkflow] Skipped: Only ${daysSince.toFixed(1)} days since last newsletter`)
        return {
          status: "skipped",
          debug: {
            reason: "Less than 14 days since last newsletter",
            daysSinceLastNewsletter: daysSince,
          },
        }
      }
    }

    console.log("[NewsletterWorkflow] Fetching newsletter subscribers...")
    const subscribersResult = await audienceTools.getNewsletterSubscribers.execute()

    if (!subscribersResult.success || !subscribersResult.users || subscribersResult.users.length === 0) {
      console.error("[NewsletterWorkflow] No subscribers found")
      return {
        status: "error",
        debug: {
          error: "No newsletter subscribers found",
          result: subscribersResult,
        },
      }
    }

    const subscribers = subscribersResult.users
    console.log(`[NewsletterWorkflow] Found ${subscribers.length} subscribers`)

    console.log("[NewsletterWorkflow] Generating newsletter sections...")

    const { text: section1 } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Write a "Growth Tip for Creators" section for the SSELFIE bi-weekly newsletter. 
      
      Sandra's voice: warm, direct, story-driven. 
      
      The tip should be actionable, relatable, and focused on personal branding or Instagram growth. 
      
      Keep it 150-200 words. No emojis. Format as plain text with simple line breaks.`,
    })

    const { text: section2 } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Write a "Feature Spotlight" section for the SSELFIE bi-weekly newsletter. 
      
      Highlight a feature that helps creators build their personal brand (could be Maya, photoshoots, video generation, or the feed planner). 
      
      Sandra's voice: warm, empowering, real talk. 
      
      Keep it 150-200 words. No emojis. Format as plain text.`,
    })

    const { text: section3 } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Write a "Success Story / Inspiration" section for the SSELFIE bi-weekly newsletter. 
      
      This should be an inspiring anecdote about a creator who built their personal brand authentically. 
      
      Sandra's voice: emotional, hopeful, grounded in real struggle and triumph. 
      
      Keep it 150-200 words. No emojis. Format as plain text.`,
    })

    const emailBody = `
Hi there,

Welcome to the SSELFIE bi-weekly newsletter! Here's what we're covering today:

---

📈 Growth Tip for Creators

${section1}

---

✨ Feature Spotlight

${section2}

---

💡 Success Story / Inspiration

${section3}

---

Keep building your brand with intention,
Sandra & the SSELFIE team

---

P.S. Have a story to share? Reply to this email—I read them all.
    `.trim()

    console.log("[NewsletterWorkflow] Generating subject line...")
    const { text: subjectLine } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Write a compelling email subject line for the SSELFIE bi-weekly newsletter. 
      
      The newsletter includes: 
      - A growth tip for creators
      - A feature spotlight
      - An inspiring success story
      
      Sandra's voice: warm, direct, curiosity-driven. 
      
      Keep it 6-8 words. No emojis. Make it feel personal and valuable.`,
    })

    console.log(`[NewsletterWorkflow] Subject line: "${subjectLine}"`)

    console.log("[NewsletterWorkflow] Scheduling newsletter for all subscribers...")

    let scheduledCount = 0
    let errorCount = 0

    for (const subscriber of subscribers) {
      try {
        const result = await scheduleEmail(
          subscriber.id,
          subscriber.email,
          subjectLine,
          emailBody,
          new Date(), // Send immediately
        )

        if (result.success) {
          scheduledCount++
        } else {
          errorCount++
          console.error(`[NewsletterWorkflow] Failed to schedule for ${subscriber.email}:`, result.error)
        }

        // Rate limiting: 100ms between schedule operations
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        errorCount++
        console.error(`[NewsletterWorkflow] Error scheduling for ${subscriber.email}:`, error)
      }
    }

    console.log("[NewsletterWorkflow] Logging newsletter event...")
    await logEmailEvent({
      userId: input.userId || "system",
      emailType: "bi_weekly_newsletter",
      action: "scheduled",
      details: {
        subscriberCount: subscribers.length,
        scheduledCount,
        errorCount,
        subjectLine,
      },
    })

    console.log(`[NewsletterWorkflow] Newsletter workflow completed successfully`)
    console.log(`[NewsletterWorkflow] Scheduled: ${scheduledCount}, Errors: ${errorCount}`)

    return {
      status: "completed",
      debug: {
        subscriberCount: subscribers.length,
        scheduledCount,
        errorCount,
        subjectLine,
        sections: {
          growthTip: section1.substring(0, 100) + "...",
          featureSpotlight: section2.substring(0, 100) + "...",
          successStory: section3.substring(0, 100) + "...",
        },
      },
    }
  } catch (error) {
    console.error("[NewsletterWorkflow] Error running newsletter workflow:", error)
    return {
      status: "error",
      debug: {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
    }
  }
}
