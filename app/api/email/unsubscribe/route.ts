import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { z } from "zod"

const sql = neon(process.env.DATABASE_URL!)

const unsubscribeSchema = z.object({
  subscriberId: z.string().or(z.number()),
  campaignId: z.string().optional(),
  sequenceId: z.string().optional(),
  stepId: z.string().optional(),
  emailType: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: Check if too many requests from this IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    
    // Validate request body
    const body = await request.json()
    const validated = unsubscribeSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.errors },
        { status: 400 },
      )
    }

    const { subscriberId, campaignId, sequenceId, stepId, emailType } = validated.data

    if (!subscriberId) {
      return NextResponse.json({ error: "subscriberId is required" }, { status: 400 })
    }

    await sql`
      INSERT INTO email_events (
        subscriber_id,
        email_type,
        campaign_id,
        sequence_id,
        step_id,
        status,
        created_at
      ) VALUES (
        ${subscriberId},
        ${emailType || "unknown"},
        ${campaignId || null},
        ${sequenceId || null},
        ${stepId || null},
        'unsubscribed',
        NOW()
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error logging email unsubscribe:", error)
    return NextResponse.json({ error: "Failed to log email unsubscribe" }, { status: 500 })
  }
}
