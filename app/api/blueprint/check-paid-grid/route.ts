import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { checkNanoBananaPrediction } from "@/lib/nano-banana-client"
import { put } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Check if current user is admin
 */
async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    const neonUser = await getUserByAuthId(user.id)
    return neonUser?.email === ADMIN_EMAIL
  } catch {
    return false
  }
}

/**
 * GET /api/blueprint/check-paid-grid
 * 
 * Poll Nano Banana prediction status for a paid blueprint grid
 * When complete, downloads grid and stores in paid_blueprint_photo_urls
 * 
 * Query params:
 * - predictionId (required): Replicate prediction ID
 * - gridNumber (required): 1-30
 * - access (required): access_token from blueprint_subscribers
 * 
 * Client must poll this endpoint every 3-5 seconds until status === "completed"
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const predictionId = searchParams.get("predictionId")
    const gridNumberStr = searchParams.get("gridNumber")
    const accessToken = searchParams.get("access")

    // Validate inputs
    if (!predictionId || typeof predictionId !== "string") {
      return NextResponse.json(
        { error: "predictionId is required" },
        { status: 400 }
      )
    }

    if (!gridNumberStr) {
      return NextResponse.json(
        { error: "gridNumber is required" },
        { status: 400 }
      )
    }

    const gridNumber = parseInt(gridNumberStr)
    if (isNaN(gridNumber) || gridNumber < 1 || gridNumber > 30) {
      return NextResponse.json(
        { error: "gridNumber must be between 1 and 30" },
        { status: 400 }
      )
    }

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { error: "access token is required" },
        { status: 400 }
      )
    }

    console.log(`[v0][paid-blueprint] Checking Grid ${gridNumber} status: ${predictionId}`)

    const userIsAdmin = await isAdmin()

    // Verify access token (lookup subscriber)
    const subscriber = await sql`
      SELECT 
        id,
        email,
        paid_blueprint_purchased,
        paid_blueprint_photo_urls
      FROM blueprint_subscribers
      WHERE access_token = ${accessToken}
      LIMIT 1
    `

    if (subscriber.length === 0) {
      // Admin can still check (for testing)
      if (userIsAdmin) {
        console.log("[v0][paid-blueprint] Admin override - invalid token, but allowing admin access")
        return NextResponse.json(
          { 
            error: "Invalid access token",
            admin: true,
            message: "Admin override: Token not found, but admin access granted."
          },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 404 }
      )
    }

    const data = subscriber[0]

    // Check prediction status with Replicate
    const status = await checkNanoBananaPrediction(predictionId)

    console.log(`[v0][paid-blueprint] Grid ${gridNumber} prediction status: ${status.status}`)

    // If generation completed, process the grid
    if (status.status === "succeeded" && status.output) {
      console.log(`[v0][paid-blueprint] Grid ${gridNumber} completed, processing...`)

      try {
        // Download grid from Replicate
        const gridResponse = await fetch(status.output)
        if (!gridResponse.ok) {
          throw new Error(`Failed to download grid: ${gridResponse.statusText}`)
        }
        const gridBuffer = Buffer.from(await gridResponse.arrayBuffer())

        // Upload to Vercel Blob for permanent storage
        const gridBlob = await put(
          `paid-blueprint/grids/${data.id}-${gridNumber}.png`,
          gridBuffer,
          {
            access: "public",
            contentType: "image/png",
            addRandomSuffix: true,
          }
        )

        console.log(`[v0][paid-blueprint] Grid ${gridNumber} uploaded:`, gridBlob.url.substring(0, 60) + "...")

        // FIX: Use jsonb_set() to atomically update only the specific index
        // This prevents race conditions when multiple grids complete simultaneously
        const targetIndex = gridNumber - 1
        
        // Atomic update using jsonb_set() - only updates the specific index
        // jsonb_set(target, path, new_value, create_missing)
        // - target: the JSONB column
        // - path: array index as text array, e.g., ARRAY['0'] for index 0
        // - new_value: the URL as a JSON string
        // - create_missing: true to create array/expand if needed
        // Build the path array as a string literal for the SQL query
        const pathArray = `ARRAY['${targetIndex}']`
        const updateResult = await sql.unsafe(`
          UPDATE blueprint_subscribers
          SET paid_blueprint_photo_urls = jsonb_set(
            COALESCE(paid_blueprint_photo_urls, '[]'::jsonb),
            ${pathArray}::text[],
            $1::jsonb,
            true
          ),
          updated_at = NOW()
          WHERE access_token = $2
          AND (
            paid_blueprint_photo_urls IS NULL 
            OR paid_blueprint_photo_urls->>$3 IS NULL
          )
          RETURNING paid_blueprint_photo_urls
        `, [JSON.stringify(gridBlob.url), accessToken, targetIndex.toString()])

        if (updateResult.length === 0) {
          // Slot was already filled (race condition - another request got there first)
          console.log(`[v0][paid-blueprint] Grid ${gridNumber} slot already filled (concurrent update)`)
          return NextResponse.json({
            success: true,
            status: "completed",
            gridNumber,
            gridUrl: gridBlob.url,
            message: "Grid completed but slot was already filled by concurrent request",
          })
        }

        console.log(`[v0][paid-blueprint] Grid ${gridNumber} saved to database (atomic update)`)

        // Count total completed grids from the updated array
        const updatedPhotoUrls = updateResult[0].paid_blueprint_photo_urls
        const completedCount = Array.isArray(updatedPhotoUrls) 
          ? updatedPhotoUrls.filter((url: any) => url !== null && url !== undefined && url !== 'null').length
          : 0

        console.log(`[v0][paid-blueprint] Progress: ${completedCount}/30 grids complete`)

        // If all 30 grids complete, mark as generated
        if (completedCount >= 30) {
          await sql`
            UPDATE blueprint_subscribers
            SET paid_blueprint_generated = TRUE,
                paid_blueprint_generated_at = NOW(),
                updated_at = NOW()
            WHERE access_token = ${accessToken}
            AND paid_blueprint_generated = FALSE
          `
          console.log(`[v0][paid-blueprint] ✅ All 30 grids complete for ${data.email.substring(0, 3)}***`)
        }

        return NextResponse.json({
          success: true,
          status: "completed",
          gridNumber,
          gridUrl: gridBlob.url,
          totalCompleted: completedCount,
          allComplete: completedCount >= 30,
        })
      } catch (error) {
        console.error(`[v0][paid-blueprint] Error processing Grid ${gridNumber}:`, error)
        return NextResponse.json(
          {
            success: false,
            status: "failed",
            gridNumber,
            error: error instanceof Error ? error.message : "Failed to process grid",
          },
          { status: 500 }
        )
      }
    }

    // If generation failed
    if (status.status === "failed") {
      return NextResponse.json({
        success: false,
        status: "failed",
        gridNumber,
        error: status.error || "Generation failed",
      })
    }

    // Still processing
    return NextResponse.json({
      success: true,
      status: status.status, // "starting" or "processing"
      gridNumber,
    })
  } catch (error) {
    console.error("[v0][paid-blueprint] Error checking grid:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check grid status" },
      { status: 500 }
    )
  }
}
