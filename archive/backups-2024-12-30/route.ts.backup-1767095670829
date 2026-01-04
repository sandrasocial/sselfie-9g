import { NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"

const sql = getDbClient()

/**
 * Get sync status for all users with trained models
 * Shows which users have outdated versions that need syncing
 * 
 * GET /api/admin/training/sync-status
 */
export async function GET() {
  try {
    // Get the LATEST completed model for each user
    // Using window function to get the most recent model per user
    const usersWithModels = await sql`
      WITH latest_models AS (
        SELECT 
          u.id,
          u.email,
          u.display_name,
          um.id as model_id,
          um.replicate_model_id,
          um.replicate_version_id,
          um.training_status,
          um.created_at as model_created_at,
          um.updated_at as model_updated_at,
          um.training_id,
          um.completed_at,
          ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY um.updated_at DESC, um.completed_at DESC NULLS LAST) as rn
        FROM users u
        JOIN user_models um ON u.id = um.user_id
        WHERE um.training_status = 'completed'
          AND um.replicate_model_id IS NOT NULL
      )
      SELECT 
        id,
        email,
        display_name,
        model_id,
        replicate_model_id,
        replicate_version_id,
        training_status,
        model_created_at,
        model_updated_at,
        training_id,
        completed_at
      FROM latest_models
      WHERE rn = 1
      ORDER BY model_updated_at DESC
    `
    
    console.log(`[v0] Found ${usersWithModels.length} users with completed models`)
    
    // Log users with multiple models (for debugging)
    const usersWithMultipleModels = await sql`
      SELECT 
        u.id,
        u.email,
        COUNT(um.id) as model_count
      FROM users u
      JOIN user_models um ON u.id = um.user_id
      WHERE um.training_status = 'completed'
        AND um.replicate_model_id IS NOT NULL
      GROUP BY u.id, u.email
      HAVING COUNT(um.id) > 1
    `
    
    if (usersWithMultipleModels.length > 0) {
      console.log(`[v0] Users with multiple completed models:`, usersWithMultipleModels.map((u: any) => ({
        email: u.email,
        count: u.model_count
      })))
    }

    if (usersWithModels.length === 0) {
      return NextResponse.json({
        users: [],
        summary: {
          total: 0,
          needsSync: 0,
          upToDate: 0,
          errors: 0,
        },
      })
    }

    // Check each user's version against Replicate
    const usersWithStatus = await Promise.all(
      usersWithModels.map(async (user: any) => {
        // Extract version hash from stored version (handles both formats)
        const currentVersion = user.replicate_version_id?.includes(':')
          ? user.replicate_version_id.split(':')[1]
          : user.replicate_version_id

        // If no version stored, definitely needs sync
        if (!currentVersion) {
          return {
            ...user,
            status: "needs_sync",
            error: "No version stored in database",
            currentVersion: null,
            latestVersion: null,
            needsSync: true,
          }
        }

        try {
          // Fetch latest version from Replicate
          const modelResponse = await fetch(
            `https://api.replicate.com/v1/models/${user.replicate_model_id}/versions`,
            {
              headers: {
                Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
              },
            }
          )

          if (!modelResponse.ok) {
            const errorText = await modelResponse.text().catch(() => '')
            console.error(`[v0] Failed to fetch versions for ${user.replicate_model_id}:`, modelResponse.status, errorText)
            return {
              ...user,
              status: "error",
              error: `Failed to fetch: ${modelResponse.status} ${errorText.substring(0, 50)}`,
              currentVersion,
              latestVersion: null,
              needsSync: false,
            }
          }

          const versionsData = await modelResponse.json()
          
          // Get the latest version (first in results array)
          const latestVersion = versionsData.results?.[0]?.id

          if (!latestVersion) {
            return {
              ...user,
              status: "error",
              error: "No versions found in Replicate",
              currentVersion,
              latestVersion: null,
              needsSync: false,
            }
          }

          // Compare versions (case-insensitive, trim whitespace)
          const needsSync = currentVersion?.trim().toLowerCase() !== latestVersion?.trim().toLowerCase()

          // Log for debugging
          if (needsSync) {
            console.log(`[v0] User ${user.email} needs sync:`, {
              current: currentVersion,
              latest: latestVersion,
              model: user.replicate_model_id,
            })
          }

          return {
            ...user,
            status: needsSync ? "needs_sync" : "up_to_date",
            currentVersion,
            latestVersion,
            needsSync,
            error: null,
            // Add debug info
            totalVersionsOnReplicate: versionsData.results?.length || 0,
            allVersions: versionsData.results?.slice(0, 5).map((v: any) => ({
              id: v.id,
              created_at: v.created_at,
            })) || [],
          }
        } catch (error: any) {
          console.error(`[v0] Error checking version for user ${user.email}:`, error)
          return {
            ...user,
            status: "error",
            error: error.message || "Unknown error",
            currentVersion,
            latestVersion: null,
            needsSync: false,
          }
        }
      })
    )

    // Sort users: needs sync first, then errors, then up to date
    const sortedUsers = usersWithStatus.sort((a, b) => {
      if (a.needsSync && !b.needsSync) return -1
      if (!a.needsSync && b.needsSync) return 1
      if (a.status === "error" && b.status !== "error") return -1
      if (a.status !== "error" && b.status === "error") return 1
      return 0
    })

    const summary = {
      total: usersWithStatus.length,
      needsSync: usersWithStatus.filter((u) => u.needsSync).length,
      upToDate: usersWithStatus.filter((u) => u.status === "up_to_date").length,
      errors: usersWithStatus.filter((u) => u.status === "error").length,
    }

    console.log(`[v0] Sync status summary:`, summary)
    console.log(`[v0] Users needing sync:`, sortedUsers.filter((u) => u.needsSync).map((u) => ({
      email: u.email,
      current: u.currentVersion,
      latest: u.latestVersion,
    })))

    return NextResponse.json({
      users: sortedUsers,
      summary,
    })
  } catch (error) {
    console.error("[v0] Error fetching sync status:", error)
    return NextResponse.json(
      { error: "Failed to fetch sync status" },
      { status: 500 }
    )
  }
}
