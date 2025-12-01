/**
 * Daily Visibility Engine Pipeline
 * 
 * Trigger: Daily at 09:00
 * Flow:
 * 1. DailyContentAgent → reel
 * 2. DailyContentAgent → caption
 * 3. DailyContentAgent → story sequence
 * 4. FeedDesignerAgent → layout ideas
 * 5. Save results in admin dashboard under "Daily Drops"
 * 6. Notify admin (Sandra) via email
 */

import { PipelineOrchestrator } from "../orchestrator/pipeline"
import type { PipelineStep } from "../orchestrator/types"
import { DailyContentAgent } from "../content/dailyContentAgent"
import { FeedDesignerAgent } from "../content/feedDesignerAgent"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/resend"

const sql = neon(process.env.DATABASE_URL!)

export interface DailyVisibilityInput {
  date?: string // Optional date, defaults to today
  topic?: string // Optional topic, defaults to auto-generated
}

export interface DailyVisibilityOutput {
  success: boolean
  reel?: any
  caption?: any
  stories?: any
  layoutIdeas?: any
  savedToDashboard: boolean
  adminNotified: boolean
  error?: string
}

/**
 * Create Daily Visibility Pipeline
 */
export function createDailyVisibilityPipeline() {
  const steps: PipelineStep[] = [
    {
      name: "generateReel",
      agent: new DailyContentAgent(),
      input: (context: unknown) => {
        const input = context as DailyVisibilityInput
        return {
          type: "reel",
          topic: input.topic || "personal branding and visibility",
          context: {
            date: input.date || new Date().toISOString(),
            purpose: "daily_content",
          },
        }
      },
    },
    {
      name: "generateCaption",
      agent: new DailyContentAgent(),
      input: (context: unknown) => {
        const input = context as DailyVisibilityInput
        return {
          type: "caption",
          topic: input.topic || "personal branding and visibility",
          contentType: "reel",
          context: {
            date: input.date || new Date().toISOString(),
            purpose: "daily_content",
          },
        }
      },
    },
    {
      name: "generateStories",
      agent: new DailyContentAgent(),
      input: (context: unknown) => {
        const input = context as DailyVisibilityInput
        return {
          type: "story",
          context: {
            date: input.date || new Date().toISOString(),
            purpose: "daily_content",
          },
        }
      },
    },
    {
      name: "generateLayoutIdeas",
      agent: new FeedDesignerAgent(),
      input: (context: unknown) => {
        return {
          action: "generateLayoutIdeas",
          params: {
            count: 5,
            style: "editorial_luxury",
          },
        }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

/**
 * Save daily drops to database
 */
async function saveDailyDrops(data: {
  date: string
  reel: any
  caption: any
  stories: any
  layoutIdeas: any
}): Promise<boolean> {
  try {
    await sql`
      INSERT INTO daily_drops (
        date,
        reel_content,
        caption_content,
        stories_content,
        layout_ideas,
        created_at
      ) VALUES (
        ${data.date}::date,
        ${JSON.stringify(data.reel)},
        ${JSON.stringify(data.caption)},
        ${JSON.stringify(data.stories)},
        ${JSON.stringify(data.layoutIdeas)},
        NOW()
      )
      ON CONFLICT (date) DO UPDATE SET
        reel_content = ${JSON.stringify(data.reel)},
        caption_content = ${JSON.stringify(data.caption)},
        stories_content = ${JSON.stringify(data.stories)},
        layout_ideas = ${JSON.stringify(data.layoutIdeas)},
        updated_at = NOW()
    `
    return true
  } catch (error) {
    console.error("[DailyVisibilityPipeline] Error saving to database:", error)
    return false
  }
}

/**
 * Notify admin that content is ready
 */
async function notifyAdmin(data: {
  date: string
  reel: any
  caption: any
  stories: any
}): Promise<boolean> {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Times New Roman', serif; color: #292524; background-color: #fafaf9; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; background: white; }
            h1 { font-size: 28px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 20px; }
            p { font-size: 14px; line-height: 1.7; color: #57534e; margin-bottom: 16px; }
            .content-box { background: #fafaf9; padding: 20px; margin: 15px 0; border-radius: 6px; border-left: 4px solid #292524; }
            .content-title { font-size: 16px; font-weight: 600; color: #292524; margin-bottom: 8px; }
            .cta { background: #292524; color: white; padding: 14px 28px; text-align: center; text-decoration: none; display: inline-block; margin-top: 25px; border-radius: 4px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>DAILY DROPS READY</h1>
            
            <p>Hi Sandra,</p>
            
            <p>Your daily content is ready for ${data.date}:</p>
            
            <div class="content-box">
              <div class="content-title">REEL</div>
              <p style="margin: 0; font-size: 13px;">${data.reel?.title || "Reel content generated"}</p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #78716c;">${data.reel?.hook || ""}</p>
            </div>
            
            <div class="content-box">
              <div class="content-title">CAPTION</div>
              <p style="margin: 0; font-size: 13px; white-space: pre-wrap;">${data.caption?.caption?.substring(0, 200) || "Caption generated"}...</p>
            </div>
            
            <div class="content-box">
              <div class="content-title">STORIES</div>
              <p style="margin: 0; font-size: 13px;">${data.stories?.title || "Story ideas generated"}</p>
            </div>
            
            <p style="margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/admin/ai/daily" class="cta" style="color: white;">View in Dashboard</a>
            </p>
          </div>
        </body>
      </html>
    `

    const result = await sendEmail({
      to: adminEmail,
      subject: `Daily Drops Ready - ${data.date}`,
      html,
    })

    return result.success
  } catch (error) {
    console.error("[DailyVisibilityPipeline] Error notifying admin:", error)
    return false
  }
}

/**
 * Run Daily Visibility Pipeline
 */
export async function runDailyVisibilityPipeline(
  input: DailyVisibilityInput = {},
): Promise<DailyVisibilityOutput> {
  try {
    const date = input.date || new Date().toISOString().split("T")[0]
    console.log(`[DailyVisibilityPipeline] Starting for ${date}`)

    const pipeline = createDailyVisibilityPipeline()
    const result = await pipeline.run(input)

    if (!result.ok) {
      console.error(`[DailyVisibilityPipeline] Failed at step: ${result.failedAt}`)
      return {
        success: false,
        savedToDashboard: false,
        adminNotified: false,
        error: `Pipeline failed at ${result.failedAt}`,
      }
    }

    // Extract results from steps
    const reel = result.steps[0]?.data
    const caption = result.steps[1]?.data
    const stories = result.steps[2]?.data
    const layoutIdeas = result.steps[3]?.data

    // Save to database
    const saved = await saveDailyDrops({
      date,
      reel,
      caption,
      stories,
      layoutIdeas,
    })

    // Notify admin
    const notified = await notifyAdmin({
      date,
      reel,
      caption,
      stories,
    })

    console.log(`[DailyVisibilityPipeline] Complete for ${date}`)

    return {
      success: true,
      reel,
      caption,
      stories,
      layoutIdeas,
      savedToDashboard: saved,
      adminNotified: notified,
    }
  } catch (error) {
    console.error("[DailyVisibilityPipeline] Error:", error)
    return {
      success: false,
      savedToDashboard: false,
      adminNotified: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

