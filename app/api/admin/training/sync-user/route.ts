import { NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"

const sql = getDbClient()

/**
 * Admin endpoint to sync a specific user's model version
 * 
 * POST /api/admin/training/sync-user
 * Body: { userId: string }
 */
export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    // Get user's model
    const models = await sql`
      SELECT 
        id,
        replicate_model_id,
        replicate_version_id
      FROM user_models
      WHERE user_id = ${userId}
        AND training_status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (models.length === 0) {
      return NextResponse.json(
        { error: "No completed model found for this user" },
        { status: 404 }
      )
    }

    const model = models[0]

    if (!model.replicate_model_id) {
      return NextResponse.json(
        { error: "Model ID not found" },
        { status: 400 }
      )
    }

    // Fetch latest version from Replicate
    const modelResponse = await fetch(
      `https://api.replicate.com/v1/models/${model.replicate_model_id}/versions`,
      {
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        },
      }
    )

    if (!modelResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch versions: ${modelResponse.status}` },
        { status: 500 }
      )
    }

    const versionsData = await modelResponse.json()
    const latestVersion = versionsData.results?.[0]?.id

    if (!latestVersion) {
      return NextResponse.json(
        { error: "No versions found for this model" },
        { status: 404 }
      )
    }

    const currentVersion = model.replicate_version_id?.includes(':')
      ? model.replicate_version_id.split(':')[1]
      : model.replicate_version_id

    if (currentVersion === latestVersion) {
      return NextResponse.json({
        success: true,
        updated: false,
        message: "Already up to date",
        version: latestVersion,
      })
    }

    // Update to latest version
    const updatedLoraUrl = `https://replicate.delivery/pbxt/${latestVersion}/flux-lora.tar`

    await sql`
      UPDATE user_models
      SET 
        replicate_version_id = ${latestVersion},
        lora_weights_url = ${updatedLoraUrl},
        updated_at = NOW()
      WHERE id = ${model.id}
    `

    return NextResponse.json({
      success: true,
      updated: true,
      oldVersion: currentVersion,
      newVersion: latestVersion,
      message: "Version updated successfully",
    })
  } catch (error: any) {
    console.error("[v0] Error syncing user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync user" },
      { status: 500 }
    )
  }
}
