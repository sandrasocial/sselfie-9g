import { NextRequest, NextResponse } from "next/server"
import { PipelineRegistry } from "@/agents/pipelines/registry"
import { requireAdmin } from "@/lib/security/require-admin"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/resend"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/cron/daily-visibility
 * Daily Visibility Engine - Runs at 09:00 daily
 * Generates daily content and saves to admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Admin auth check (for manual triggers)
    const guard = await requireAdmin(request)
    if (guard instanceof NextResponse) {
      // If not admin, check if it's a cron job (Vercel Cron)
      const authHeader = request.headers.get("authorization")
      const cronSecret = process.env.CRON_SECRET
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return guard // Return admin error if not cron
      }
      // If no CRON_SECRET set, allow (for development)
    }

    console.log("[DailyVisibility] Starting daily content generation")

    const today = new Date().toISOString().split("T")[0]
    
    // Use the pipeline creator directly
    const { createDailyVisibilityPipeline } = await import("@/agents/pipelines/daily-visibility")
    const pipeline = createDailyVisibilityPipeline({ date: today, topic: "personal branding and visibility" })
    const result = await pipeline.run({ date: today, topic: "personal branding and visibility" })

    if (!result.ok) {
      console.error(`[DailyVisibility] Pipeline failed at: ${result.failedAt}`)
      return NextResponse.json(
        {
          error: `Pipeline failed at ${result.failedAt}`,
          savedToDashboard: false,
          adminNotified: false,
        },
        { status: 500 },
      )
    }

    // Extract results from steps
    const reel = result.steps[0]?.data
    const caption = result.steps[1]?.data
    const stories = result.steps[2]?.data
    const layoutIdeas = result.steps[3]?.data

    // Save to database
    let savedToDashboard = false
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
          ${today}::date,
          ${JSON.stringify(reel)},
          ${JSON.stringify(caption)},
          ${JSON.stringify(stories)},
          ${JSON.stringify(layoutIdeas)},
          NOW()
        )
        ON CONFLICT (date) DO UPDATE SET
          reel_content = ${JSON.stringify(reel)},
          caption_content = ${JSON.stringify(caption)},
          stories_content = ${JSON.stringify(stories)},
          layout_ideas = ${JSON.stringify(layoutIdeas)},
          updated_at = NOW()
      `
      savedToDashboard = true
      console.log("[DailyVisibility] Saved to database")
    } catch (dbError) {
      console.error("[DailyVisibility] Error saving to database:", dbError)
    }

    // Notify admin
    let adminNotified = false
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
              <p>Your daily content is ready for ${today}:</p>
              <div class="content-box">
                <div class="content-title">REEL</div>
                <p style="margin: 0; font-size: 13px;">${reel?.title || "Reel content generated"}</p>
                <p style="margin: 8px 0 0; font-size: 12px; color: #78716c;">${reel?.hook || ""}</p>
              </div>
              <div class="content-box">
                <div class="content-title">CAPTION</div>
                <p style="margin: 0; font-size: 13px; white-space: pre-wrap;">${caption?.caption?.substring(0, 200) || "Caption generated"}...</p>
              </div>
              <div class="content-box">
                <div class="content-title">STORIES</div>
                <p style="margin: 0; font-size: 13px;">${stories?.title || "Story ideas generated"}</p>
              </div>
              <p style="margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/admin/ai/daily-drops" class="cta" style="color: white;">View in Dashboard</a>
              </p>
            </div>
          </body>
        </html>
      `
      const emailResult = await sendEmail({
        to: adminEmail,
        subject: `Daily Drops Ready - ${today}`,
        html,
      })
      adminNotified = emailResult.success
      console.log("[DailyVisibility] Admin notification sent")
    } catch (emailError) {
      console.error("[DailyVisibility] Error notifying admin:", emailError)
    }

    return NextResponse.json({
      success: true,
      reel,
      caption,
      stories,
      layoutIdeas,
      savedToDashboard,
      adminNotified,
    })
  } catch (error) {
    console.error("[DailyVisibility] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

