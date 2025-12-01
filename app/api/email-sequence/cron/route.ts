/**
 * Email Sequence Cron Endpoint
 * Called daily by Vercel Cron to trigger email sequence
 * GET /api/email-sequence/cron
 */

import { NextResponse } from "next/server"
import { POST as triggerPost } from "../trigger/route"

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret")
    const expectedSecret = process.env.CRON_SECRET

    if (expectedSecret && cronSecret !== expectedSecret) {
      console.error("[EmailSequenceCron] Unauthorized: Invalid cron secret")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[EmailSequenceCron] Cron job triggered at", new Date().toISOString())

    // Call the trigger endpoint logic
    const triggerRequest = new Request(request.url, {
      method: "POST",
      headers: request.headers,
    })

    const response = await triggerPost(triggerRequest)
    const data = await response.json()

    if (!response.ok) {
      console.error("[EmailSequenceCron] Trigger failed:", data)
      return NextResponse.json(
        {
          success: false,
          error: data.error || "Trigger failed",
        },
        { status: response.status },
      )
    }

    console.log("[EmailSequenceCron] Trigger completed:", data)

    return NextResponse.json({
      success: true,
      triggeredAt: new Date().toISOString(),
      result: data,
    })
  } catch (error) {
    console.error("[EmailSequenceCron] Fatal error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

