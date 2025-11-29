import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const { accessToken, partialStrategy, currentStep, formData } = await req.json()

    if (!accessToken) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 })
    }

    // Get existing form_data
    const existingData = await sql`
      SELECT form_data FROM blueprint_subscribers WHERE access_token = ${accessToken} LIMIT 1
    `

    if (existingData.length === 0) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 })
    }

    const currentFormData = existingData[0].form_data || {}

    // Merge partial strategy into form_data
    const updatedFormData = {
      ...currentFormData,
      ...formData,
      partial_strategy: partialStrategy,
      last_completed_step: currentStep,
      last_saved_at: new Date().toISOString(),
    }

    await sql`
      UPDATE blueprint_subscribers
      SET form_data = ${JSON.stringify(updatedFormData)},
          updated_at = NOW()
      WHERE access_token = ${accessToken}
    `

    return NextResponse.json({ success: true, message: "Progress saved successfully" })
  } catch (error) {
    console.error("Error saving progress:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save progress" },
      { status: 500 },
    )
  }
}
