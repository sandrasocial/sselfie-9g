import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken, eventType, data } = body

    if (!accessToken || !eventType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Update engagement tracking based on event type
    switch (eventType) {
      case "blueprint_completed":
        const subscriberResult = await sql`
          UPDATE blueprint_subscribers
          SET blueprint_completed = TRUE, 
              blueprint_completed_at = NOW(),
              blueprint_score = ${data.score || 0}
          WHERE access_token = ${accessToken}
          RETURNING id, email, name
        `
        
        // Trigger after-blueprint email automation (non-blocking)
        if (subscriberResult.length > 0) {
          const subscriber = subscriberResult[0]
          fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/api/automations/send-after-blueprint`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: subscriber.email,
              subscriberId: subscriber.id,
              firstName: subscriber.name?.split(" ")[0],
              blueprintUrl: data.blueprintUrl,
            }),
          }).catch((err) => {
            console.error("[Blueprint] Failed to trigger after-blueprint email:", err)
          })
        }
        break

      case "pdf_downloaded":
        await sql`
          UPDATE blueprint_subscribers
          SET pdf_downloaded = TRUE, pdf_downloaded_at = NOW()
          WHERE access_token = ${accessToken}
        `
        break

      case "cta_clicked":
        await sql`
          UPDATE blueprint_subscribers
          SET cta_clicked = TRUE, cta_clicked_at = NOW()
          WHERE access_token = ${accessToken}
        `
        break

      case "converted":
        await sql`
          UPDATE blueprint_subscribers
          SET converted_to_user = TRUE, converted_at = NOW()
          WHERE access_token = ${accessToken}
        `
        break

      default:
        return NextResponse.json({ error: "Invalid event type" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Engagement tracking error:", error)
    return NextResponse.json({ error: "Failed to track engagement" }, { status: 500 })
  }
}
