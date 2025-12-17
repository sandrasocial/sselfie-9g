import { NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"

const sql = getDbClient()

/**
 * Bulk sync multiple users' model versions
 * 
 * POST /api/admin/training/bulk-sync
 * Body: { userIds: string[] }
 */
export async function POST(request: Request) {
  try {
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds array is required" },
        { status: 400 }
      )
    }

    const results = await Promise.all(
      userIds.map(async (userId: string) => {
        try {
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
            return {
              userId,
              success: false,
              error: "No completed model found",
            }
          }

          const model = models[0]

          if (!model.replicate_model_id) {
            return {
              userId,
              success: false,
              error: "Model ID not found",
            }
          }

          // Fetch latest version
          const modelResponse = await fetch(
            `https://api.replicate.com/v1/models/${model.replicate_model_id}/versions`,
            {
              headers: {
                Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
              },
            }
          )

          if (!modelResponse.ok) {
            return {
              userId,
              success: false,
              error: `Replicate API error: ${modelResponse.status}`,
            }
          }

          const versionsData = await modelResponse.json()
          const latestVersion = versionsData.results?.[0]?.id

          if (!latestVersion) {
            return {
              userId,
              success: false,
              error: "No versions found",
            }
          }

          const currentVersion = model.replicate_version_id?.includes(':')
            ? model.replicate_version_id.split(':')[1]
            : model.replicate_version_id

          if (currentVersion === latestVersion) {
            return {
              userId,
              success: true,
              updated: false,
              message: "Already up to date",
              version: latestVersion,
            }
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

          return {
            userId,
            success: true,
            updated: true,
            oldVersion: currentVersion,
            newVersion: latestVersion,
            message: "Version updated successfully",
          }
        } catch (error: any) {
          return {
            userId,
            success: false,
            error: error.message || "Unknown error",
          }
        }
      })
    )

    const summary = {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      updated: results.filter((r) => r.success && r.updated).length,
      alreadyUpToDate: results.filter((r) => r.success && !r.updated).length,
      failed: results.filter((r) => !r.success).length,
    }

    return NextResponse.json({
      results,
      summary,
    })
  } catch (error) {
    console.error("[v0] Error in bulk sync:", error)
    return NextResponse.json(
      { error: "Failed to perform bulk sync" },
      { status: 500 }
    )
  }
}
