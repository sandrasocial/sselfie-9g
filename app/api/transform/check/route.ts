import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

import { requireAcademyUser } from "@/lib/academy-server-access"
import { refundCredits } from "@/lib/credits"
import { checkNanoBananaPrediction } from "@/lib/nano-banana-client"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { neonUser } = await requireAcademyUser()

    const predictionId = request.nextUrl.searchParams.get("id")
    if (!predictionId) {
      return NextResponse.json({ error: "Prediction ID required" }, { status: 400 })
    }

    // Verify this prediction belongs to the requesting user
    const rows = await sql`
      SELECT id, status, output_image_url, credits_used
      FROM transform_generations
      WHERE prediction_id = ${predictionId}
        AND user_id = ${neonUser.id}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 })
    }

    const record = rows[0]

    // Already completed — return stored result
    if (record.status === "succeeded" && record.output_image_url) {
      return NextResponse.json({ status: "succeeded", outputUrl: record.output_image_url })
    }
    if (record.status === "failed") {
      return NextResponse.json({ status: "failed", error: "Generation failed. Your credits were returned." })
    }

    // Still processing — check Replicate
    const prediction = await checkNanoBananaPrediction(predictionId)

    if (prediction.status === "succeeded" && prediction.output) {
      // Download and store in Vercel Blob for permanent access
      let blobUrl = prediction.output
      try {
        const imageResponse = await fetch(prediction.output)
        const imageBlob = await imageResponse.blob()
        const blob = await put(`transform/${neonUser.id}/${predictionId}.jpg`, imageBlob, {
          access: "public",
        })
        blobUrl = blob.url
      } catch (e) {
        console.warn("[transform/check] Blob upload failed, using Replicate URL:", e)
      }

      await sql`
        UPDATE transform_generations
        SET status = 'succeeded', output_image_url = ${blobUrl}, completed_at = NOW()
        WHERE prediction_id = ${predictionId}
      `

      return NextResponse.json({ status: "succeeded", outputUrl: blobUrl })
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      const refund = await refundCredits(
        neonUser.id,
        Number(record.credits_used || 0),
        "Transform edit failed - credits returned",
        predictionId,
      )

      await sql`
        UPDATE transform_generations
        SET status = 'failed', completed_at = NOW()
        WHERE prediction_id = ${predictionId}
      `
      return NextResponse.json({
        status: "failed",
        error: refund.success
          ? "Generation failed. Your credits were returned."
          : "Generation failed. Please contact support if your credits do not return.",
        creditsRefunded: refund.refunded,
        creditsRemaining: refund.success ? refund.newBalance : undefined,
      })
    }

    return NextResponse.json({ status: prediction.status })
  } catch (error) {
    console.error("[transform/check] Error:", error)
    return NextResponse.json({ error: "Status check failed" }, { status: 500 })
  }
}
