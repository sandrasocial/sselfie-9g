import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"
import { requireAdmin, isProPhotoshootEnabled } from "@/lib/admin-feature-flags"
import { generateWithNanoBanana } from "@/lib/nano-banana-client"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { checkCredits, deductCredits } from "@/lib/credits"
import { getUniversalPrompt, getPromptForGrid } from "@/lib/maya/pro-photoshoot-prompts"

const sql = getDbClient()

// Credit cost for 4K Pro Photoshoot grids
const PRO_PHOTOSHOOT_4K_CREDITS = 3

export async function POST(request: NextRequest) {
  try {
    // Check feature flag
    const featureEnabled = await isProPhotoshootEnabled()
    if (!featureEnabled) {
      return NextResponse.json({ error: "Feature not enabled" }, { status: 403 })
    }

    // Check admin access
    const adminCheck = await requireAdmin()
    if (!adminCheck.isAdmin || !adminCheck.userId) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { 
      originalImageId, 
      gridNumber, 
      sessionId, 
      customPromptData,
      avatarImages // Array of avatar image URLs from concept card
    } = body

    if (!originalImageId || !gridNumber || !sessionId) {
      return NextResponse.json(
        { error: "originalImageId, gridNumber, and sessionId are required" },
        { status: 400 }
      )
    }

    // Verify session belongs to admin
    const [session] = await sql`
      SELECT id, user_id, original_image_id, total_grids
      FROM pro_photoshoot_sessions
      WHERE id = ${sessionId} AND user_id = ${adminCheck.userId}
    `

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // CRITICAL FIX: Auto-derive avatarImages from originalImageId if missing (admin panel fallback)
    // Admin panel doesn't have concept card context, so we use the original image as avatar
    let finalAvatarImages: string[] = []
    if (avatarImages && Array.isArray(avatarImages) && avatarImages.length > 0) {
      // Use provided avatar images (from concept card)
      finalAvatarImages = avatarImages
    } else {
      // Fallback: Fetch original image URL and use as avatar (admin panel use case)
      const [originalImage] = await sql`
        SELECT image_url FROM ai_images
        WHERE id = ${originalImageId} AND user_id = ${adminCheck.userId}
      `
      if (originalImage && originalImage.image_url) {
        finalAvatarImages = [originalImage.image_url]
        console.log("[ProPhotoshoot] ⚠️ avatarImages not provided, using original image as avatar:", originalImage.image_url.substring(0, 60))
      } else {
        return NextResponse.json(
          { error: "Original image not found or has no image_url, and avatarImages not provided" },
          { status: 400 }
        )
      }
    }

    // Check if grid already exists
    const [existingGrid] = await sql`
      SELECT id, prediction_id, generation_status
      FROM pro_photoshoot_grids
      WHERE session_id = ${sessionId} AND grid_number = ${gridNumber}
    `

    if (existingGrid && existingGrid.generation_status === "completed") {
      return NextResponse.json({
        success: true,
        gridId: existingGrid.id,
        predictionId: existingGrid.prediction_id,
        status: "completed",
        message: "Grid already generated",
      })
    }

    // Check credits (3 credits per grid for 4K)
    const hasCredits = await checkCredits(adminCheck.userId, PRO_PHOTOSHOOT_4K_CREDITS)
    if (!hasCredits) {
      return NextResponse.json(
        { error: `Insufficient credits. Pro Photoshoot grids require ${PRO_PHOTOSHOOT_4K_CREDITS} credits each (4K resolution).` },
        { status: 402 }
      )
    }

    // Get ALL previous completed grids for this session (REQUIRED for style consistency)
    const previousGrids = await sql`
      SELECT id, grid_number, grid_url, created_at
      FROM pro_photoshoot_grids
      WHERE session_id = ${sessionId}
        AND grid_number < ${gridNumber}
        AND generation_status = 'completed'
        AND grid_url IS NOT NULL
      ORDER BY grid_number ASC
    `

    console.log(`[ProPhotoshoot] Found ${previousGrids.length} previous grids for Grid ${gridNumber}`)

    // Build image_input: avatars + all previous grids
    const imageInput: string[] = []
    
    // Step 1: Add avatar images (ALWAYS first, for facial consistency)
    finalAvatarImages.forEach((url: string) => {
      if (url && typeof url === 'string' && url.startsWith('http')) {
        imageInput.push(url)
      }
    })
    
    // CRITICAL FIX: Track actual avatar count (valid URLs only)
    // Some URLs might be invalid and filtered out, so we need the actual count added
    const actualAvatarCount = imageInput.length

    // Step 2: Add ALL previous grids (REQUIRED for style/outfit/colorgrade consistency)
    previousGrids.forEach((grid: any) => {
      if (grid.grid_url && typeof grid.grid_url === 'string' && grid.grid_url.startsWith('http')) {
        imageInput.push(grid.grid_url)
      }
    })

    // Step 3: Handle 14 image limit (Nano Banana Pro max)
    // If exceeded: Keep all avatars + newest grids (exclude oldest grids)
    if (imageInput.length > 14) {
      const maxGrids = 14 - actualAvatarCount
      
      if (maxGrids > 0) {
        // Keep newest grids only
        const newestGrids = previousGrids.slice(-maxGrids)
        imageInput.length = 0 // Reset array
        
        // Rebuild: avatars first, then newest grids
        finalAvatarImages.forEach((url: string) => {
          if (url && typeof url === 'string' && url.startsWith('http')) {
            imageInput.push(url)
          }
        })
        newestGrids.forEach((grid: any) => {
          if (grid.grid_url && typeof grid.grid_url === 'string' && grid.grid_url.startsWith('http')) {
            imageInput.push(grid.grid_url)
          }
        })
        
        console.log(`[ProPhotoshoot] ⚠️ Image limit exceeded (${previousGrids.length} grids). Keeping ${actualAvatarCount} avatars + ${newestGrids.length} newest grids (excluded ${previousGrids.length - newestGrids.length} oldest)`)
      } else {
        // Edge case: too many avatars, keep only avatars
        imageInput.length = 0
        finalAvatarImages.slice(0, 14).forEach((url: string) => {
          if (url && typeof url === 'string' && url.startsWith('http')) {
            imageInput.push(url)
          }
        })
        console.log(`[ProPhotoshoot] ⚠️ Too many avatar images (${finalAvatarImages.length}). Using first 14 only.`)
      }
    }

    console.log(`[ProPhotoshoot] Image input: ${imageInput.length} images (${actualAvatarCount} valid avatars + ${previousGrids.length} previous grids)`)

    // Get prompt for grid
    let prompt: string
    if (gridNumber === 1) {
      // Grid 1: Use custom prompt (from Maya or fallback)
      prompt = getPromptForGrid(gridNumber, customPromptData)
    } else {
      // Grids 2-8: Use universal prompt
      prompt = getUniversalPrompt()
    }

    // Deduct credits BEFORE generation
    const creditResult = await deductCredits(
      adminCheck.userId,
      PRO_PHOTOSHOOT_4K_CREDITS,
      "image",
      `Pro Photoshoot Grid ${gridNumber} (4K)`
    )

    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error || "Failed to deduct credits" },
        { status: 402 }
      )
    }

    // Create or update grid record
    let gridId: number
    if (existingGrid) {
      gridId = existingGrid.id
      await sql`
        UPDATE pro_photoshoot_grids
        SET generation_status = 'generating',
            prompt = ${prompt},
            updated_at = NOW()
        WHERE id = ${gridId}
      `
    } else {
      const [newGrid] = await sql`
        INSERT INTO pro_photoshoot_grids (
          session_id,
          grid_number,
          prompt,
          generation_status
        ) VALUES (
          ${sessionId},
          ${gridNumber},
          ${prompt},
          'generating'
        )
        RETURNING id
      `
      gridId = newGrid.id
    }

    console.log(`[ProPhotoshoot] 🎨 Generating Grid ${gridNumber} with ${imageInput.length} images (${avatarImages.length} avatars + ${previousGrids.length} previous grids)`)

    // Generate with NanoBanana Pro (4K resolution)
    const result = await generateWithNanoBanana({
      prompt,
      image_input: imageInput,
      aspect_ratio: "1:1", // 3x3 grid is square
      resolution: "4K", // ✅ 4K resolution (3 credits)
      output_format: "png",
      safety_filter_level: "block_only_high",
    })

    // Update grid with prediction ID
    await sql`
      UPDATE pro_photoshoot_grids
      SET prediction_id = ${result.predictionId},
          updated_at = NOW()
      WHERE id = ${gridId}
    `

    console.log(`[ProPhotoshoot] ✅ Grid ${gridNumber} generation started: ${result.predictionId} (${PRO_PHOTOSHOOT_4K_CREDITS} credits deducted, new balance: ${creditResult.newBalance})`)

    return NextResponse.json({
      success: true,
      gridId,
      predictionId: result.predictionId,
      status: result.status,
      creditsDeducted: PRO_PHOTOSHOOT_4K_CREDITS,
      newBalance: creditResult.newBalance,
    })
  } catch (error) {
    console.error("[ProPhotoshoot] ❌ Error generating grid:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate grid" },
      { status: 500 }
    )
  }
}

