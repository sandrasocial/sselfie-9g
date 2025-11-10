import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { generateLaunchEmail } from "@/lib/email/templates/launch-email"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { confirmed } = await request.json()

    if (!confirmed) {
      return NextResponse.json({ error: "Please confirm you want to send to all subscribers" }, { status: 400 })
    }

    // Get all freebie subscribers
    const subscribers = await sql`
      SELECT 
        email,
        name
      FROM freebie_subscribers
      WHERE email IS NOT NULL
      ORDER BY created_at DESC
    `

    console.log(`[v0] Sending launch email to ${subscribers.length} subscribers`)

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const subscriber of subscribers) {
      try {
        const { html, text } = generateLaunchEmail({
          recipientName: subscriber.name || undefined,
        })

        const result = await sendEmail({
          to: subscriber.email,
          subject: "🚨 THE DOORS ARE OPEN - SSELFIE Studio Beta is LIVE",
          html,
          text,
          tags: ["launch", "beta", "campaign"],
        })

        if (result.success) {
          sent++
          console.log(`[v0] ✓ Sent to ${subscriber.email}`)
        } else {
          failed++
          errors.push(`${subscriber.email}: ${result.error}`)
          console.error(`[v0] ✗ Failed to send to ${subscriber.email}:`, result.error)
        }

        // Rate limiting: wait 200ms between sends (5 emails per second max)
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (error) {
        failed++
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        errors.push(`${subscriber.email}: ${errorMessage}`)
        console.error(`[v0] ✗ Error sending to ${subscriber.email}:`, error)
      }
    }

    console.log(`[v0] Launch campaign complete: ${sent} sent, ${failed} failed`)

    return NextResponse.json({
      success: true,
      totalSubscribers: subscribers.length,
      sent,
      failed,
      errors: errors.slice(0, 10), // Return first 10 errors only
    })
  } catch (error) {
    console.error("[v0] Error sending launch campaign:", error)
    return NextResponse.json({ error: "Failed to send launch campaign" }, { status: 500 })
  }
}
