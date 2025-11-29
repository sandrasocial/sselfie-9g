import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateUpsellSequence, runUpsellSequence } from "@/agents/marketing/marketingAutomationAgent"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { upsellId } = await request.json()

    if (!upsellId) {
      return NextResponse.json({ success: false, error: "upsellId is required" }, { status: 400 })
    }

    // Fetch the upsell queue item
    const upsell = await sql`
      SELECT 
        uq.id,
        uq.subscriber_id,
        uq.intelligence,
        bs.email,
        bs.name,
        bs.form_data
      FROM upsell_queue uq
      JOIN blueprint_subscribers bs ON uq.subscriber_id = bs.id
      WHERE uq.id = ${upsellId}
      LIMIT 1
    `

    if (upsell.length === 0) {
      return NextResponse.json({ success: false, error: "Upsell not found" }, { status: 404 })
    }

    const { subscriber_id, intelligence, email, name, form_data } = upsell[0]

    // Step 1: Generate upsell sequence drafts
    const generateResult = await generateUpsellSequence({
      subscriberId: subscriber_id,
      email,
      name: name || "there",
      intelligence,
      formData: form_data || {},
    })

    if (!generateResult.success || !generateResult.draftIds) {
      throw new Error(generateResult.error || "Failed to generate upsell sequence")
    }

    // Step 2: Run the upsell sequence (schedule emails)
    const runResult = await runUpsellSequence({
      subscriberId: subscriber_id,
      email,
      name: name || "there",
      draftIds: generateResult.draftIds,
    })

    if (!runResult.success) {
      throw new Error(runResult.error || "Failed to run upsell sequence")
    }

    // Step 3: Mark as approved and processed
    await sql`
      UPDATE upsell_queue
      SET approved = TRUE, processed = TRUE
      WHERE id = ${upsellId}
    `

    // Step 4: Log the approval event
    await sql`
      INSERT INTO upsell_history (subscriber_id, event, metadata, created_at)
      VALUES (
        ${subscriber_id},
        'upsell_approved',
        ${JSON.stringify({
          upsellId,
          draftIds: generateResult.draftIds,
          instanceId: runResult.instanceId,
        })},
        NOW()
      )
    `

    console.log(`[API] Upsell approved and sequence started for subscriber ${subscriber_id}`)

    return NextResponse.json({
      success: true,
      message: "Upsell approved and sequence started",
      instanceId: runResult.instanceId,
    })
  } catch (error) {
    console.error("[API] Error approving upsell:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
