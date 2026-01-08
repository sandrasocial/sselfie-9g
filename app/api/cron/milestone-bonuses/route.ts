import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { addCredits } from "@/lib/credits"
import { sendEmail } from "@/lib/email/send-email"
import { generateMilestoneBonusEmail } from "@/lib/email/templates/milestone-bonus"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/cron/milestone-bonuses
 * 
 * Cron job to detect user milestones and grant bonus credits
 * Runs daily to check for users who hit 10, 50, or 100 image generations
 * 
 * Protected with CRON_SECRET verification
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("[v0] [CRON] CRON_SECRET not configured")
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[v0] [CRON] Unauthorized milestone-bonuses cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] [CRON] Starting milestone bonuses processing...")

    // Check if milestone bonuses are enabled
    const milestoneBonusesEnabled = process.env.MILESTONE_BONUSES_ENABLED === "true"

    if (!milestoneBonusesEnabled) {
      console.log("[v0] [CRON] ⚠️ Milestone bonuses temporarily disabled (MILESTONE_BONUSES_ENABLED=false)")
      return NextResponse.json({
        success: true,
        enabled: false,
        message: "Milestone bonuses temporarily disabled until cost model review",
        processed: 0,
        errors: 0,
        details: [],
      })
    }

    // Define milestones: [milestone, reward]
    const milestones = [
      [10, 10],
      [50, 25],
      [100, 50],
    ] as const

    const results = {
      processed: 0,
      errors: 0,
      details: [] as Array<{ userId: string; milestone: number; reward: number; success: boolean; error?: string }>,
    }

    for (const [milestone, reward] of milestones) {
      try {
        // Find users who have exactly this many images and haven't received this milestone bonus
        const usersAtMilestone = await sql`
          SELECT 
            u.id,
            u.email,
            u.display_name,
            COUNT(gi.id) as total_images
          FROM users u
          INNER JOIN generated_images gi ON gi.user_id = u.id
          LEFT JOIN credit_transactions ct ON ct.user_id = u.id 
            AND ct.transaction_type = 'bonus' 
            AND ct.description LIKE ${`Milestone ${milestone}%`}
          WHERE ct.id IS NULL
          GROUP BY u.id, u.email, u.display_name
          HAVING COUNT(gi.id) = ${milestone}
          LIMIT 100
        `

        console.log(`[v0] [CRON] Found ${usersAtMilestone.length} users at milestone ${milestone}`)

        for (const user of usersAtMilestone) {
          try {
            // Grant bonus credits
            const creditResult = await addCredits(
              user.id,
              reward,
              "bonus",
              `Milestone ${milestone} bonus`,
            )

            if (!creditResult.success) {
              throw new Error(`Failed to grant credits: ${creditResult.error}`)
            }

            // Send milestone email
            try {
              const emailContent = generateMilestoneBonusEmail({
                firstName: user.display_name?.split(" ")[0] || undefined,
                milestone,
                rewardAmount: reward,
              })

              await sendEmail({
                to: user.email,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
                from: "Maya from SSELFIE <hello@sselfie.ai>",
                emailType: "milestone-bonus",
              })

              console.log(`[v0] [CRON] ✅ Milestone ${milestone} bonus sent to ${user.email}`)
            } catch (emailError: any) {
              console.error(`[v0] [CRON] ⚠️ Failed to send milestone email (non-critical):`, emailError.message)
              // Don't fail the process if email fails
            }

            results.processed++
            results.details.push({
              userId: user.id,
              milestone,
              reward,
              success: true,
            })

            console.log(`[v0] [CRON] ✅ Processed milestone ${milestone} for user ${user.id}`)
          } catch (error: any) {
            results.errors++
            results.details.push({
              userId: user.id,
              milestone,
              reward,
              success: false,
              error: error.message,
            })
            console.error(`[v0] [CRON] ❌ Error processing milestone ${milestone} for user ${user.id}:`, error.message)
          }
        }
      } catch (error: any) {
        console.error(`[v0] [CRON] ❌ Error processing milestone ${milestone}:`, error.message)
        results.errors++
      }
    }

    console.log(`[v0] [CRON] Milestone bonuses processing complete: ${results.processed} processed, ${results.errors} errors`)

    return NextResponse.json({
      success: true,
      processed: results.processed,
      errors: results.errors,
      details: results.details,
    })
  } catch (error) {
    console.error("[v0] [CRON] Error in milestone bonuses cron:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process milestone bonuses" },
      { status: 500 },
    )
  }
}
