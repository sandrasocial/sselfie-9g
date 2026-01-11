import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getBlueprintEntitlement } from "@/lib/subscription"
import { getUserCredits } from "@/lib/credits"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/blueprint/state
 * 
 * Get blueprint state for authenticated user
 * Uses user_id from auth session (no email/token required)
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user by auth ID
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[Blueprint State] Fetching blueprint state for user:", neonUser.id)

    // Query blueprint_subscribers by user_id
    const subscriber = await sql`
      SELECT 
        id,
        email,
        name,
        form_data,
        strategy_generated,
        strategy_generated_at,
        strategy_data,
        grid_generated,
        grid_generated_at,
        grid_url,
        grid_frame_urls,
        selfie_image_urls,
        blueprint_completed,
        blueprint_completed_at,
        paid_blueprint_purchased,
        feed_style
      FROM blueprint_subscribers
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    // Decision 1: Get entitlement info and credit balance (even if no blueprint state exists)
    const entitlement = await getBlueprintEntitlement(neonUser.id)
    const creditBalance = await getUserCredits(neonUser.id)

    // If no blueprint state exists, return empty state with entitlement and credits
    if (subscriber.length === 0) {
      return NextResponse.json({
        success: true,
        blueprint: null,
        entitlement: {
          type: entitlement.type,
          creditBalance, // Decision 1: Show credits instead of quota
          freeGridUsed: entitlement.freeGridUsed, // Keep for backward compatibility
          paidGridsRemaining: entitlement.paidGridsRemaining, // Keep for backward compatibility
        },
      })
    }

    const data = subscriber[0]

    // Calculate canonical completion (strategy + grid)
    const isCompleted = (data.strategy_generated === true) && (data.grid_generated === true && data.grid_url)
    
    // Entitlement already fetched above (line 61), reuse it
    
    return NextResponse.json({
      success: true,
      blueprint: {
        formData: data.form_data || {},
        feedStyle: data.feed_style || null,
        strategy: {
          generated: data.strategy_generated || false,
          generatedAt: data.strategy_generated_at || null,
          data: data.strategy_data || null,
        },
        grid: {
          generated: data.grid_generated || false,
          generatedAt: data.grid_generated_at || null,
          gridUrl: data.grid_url || null,
          frameUrls: data.grid_frame_urls || null,
        },
        selfieImages: data.selfie_image_urls || [],
        completed: isCompleted,
        completedAt: isCompleted ? (data.blueprint_completed_at || data.grid_generated_at) : null,
        paidBlueprintPurchased: data.paid_blueprint_purchased || false,
      },
      entitlement: {
        type: entitlement.type,
        creditBalance, // Decision 1: Show credits instead of quota
        freeGridUsed: entitlement.freeGridUsed, // Keep for backward compatibility
        paidGridsRemaining: entitlement.paidGridsRemaining, // Keep for backward compatibility
      },
    })
  } catch (error) {
    console.error("[Blueprint State] Error getting blueprint state:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get blueprint state" },
      { status: 500 },
    )
  }
}

/**
 * POST /api/blueprint/state
 * 
 * Save blueprint state for authenticated user
 * Uses user_id from auth session (no email/token required)
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user by auth ID
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const {
      formData,
      feedStyle,
      selectedFeedStyle,
      selfieImages,
      strategy,
      grid,
    } = body

    console.log("[Blueprint State] Saving blueprint state for user:", neonUser.id)

    // Check if blueprint state exists for this user
    const existing = await sql`
      SELECT id, email, name
      FROM blueprint_subscribers
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    if (existing.length > 0) {
      // Update existing blueprint state
      // Use COALESCE to only update fields that are provided (preserve existing values if not provided)
      const updateFields: string[] = []
      const updateValues: any[] = []
      
      if (formData !== undefined) {
        updateFields.push(`form_data = $${updateValues.length + 1}::jsonb`)
        updateValues.push(JSON.stringify(formData))
      }
      
      if (feedStyle !== undefined || selectedFeedStyle !== undefined) {
        updateFields.push(`feed_style = $${updateValues.length + 1}`)
        updateValues.push(feedStyle || selectedFeedStyle || null)
      }
      
      if (selfieImages !== undefined) {
        updateFields.push(`selfie_image_urls = $${updateValues.length + 1}::jsonb`)
        updateValues.push(JSON.stringify(selfieImages))
      }
      
      if (strategy !== undefined) {
        updateFields.push(`strategy_generated = $${updateValues.length + 1}`)
        updateValues.push(strategy?.generated || false)
        updateFields.push(`strategy_generated_at = $${updateValues.length + 1}`)
        updateValues.push(strategy?.generated ? new Date() : null)
        updateFields.push(`strategy_data = $${updateValues.length + 1}::jsonb`)
        updateValues.push(strategy?.data ? JSON.stringify(strategy.data) : null)
      }
      
      if (grid !== undefined) {
        updateFields.push(`grid_generated = $${updateValues.length + 1}`)
        updateValues.push(grid?.generated || false)
        updateFields.push(`grid_generated_at = $${updateValues.length + 1}`)
        updateValues.push(grid?.generated ? new Date() : null)
        updateFields.push(`grid_url = $${updateValues.length + 1}`)
        updateValues.push(grid?.gridUrl || null)
        updateFields.push(`grid_frame_urls = $${updateValues.length + 1}::jsonb`)
        updateValues.push(grid?.frameUrls ? JSON.stringify(grid.frameUrls) : null)
        updateFields.push(`blueprint_completed = $${updateValues.length + 1}`)
        updateValues.push(grid?.generated && strategy?.generated || false)
        updateFields.push(`blueprint_completed_at = $${updateValues.length + 1}`)
        updateValues.push(grid?.generated && strategy?.generated ? new Date() : null)
      }
      
      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`)
        updateValues.push(neonUser.id)
        
        const query = `UPDATE blueprint_subscribers SET ${updateFields.join(', ')} WHERE user_id = $${updateValues.length}`
        await sql.unsafe(query, updateValues)
      }
    } else {
      // Create new blueprint state for user
      // Use user's email and name from users table
      const accessToken = crypto.randomUUID()
      
      await sql`
        INSERT INTO blueprint_subscribers (
          email,
          name,
          access_token,
          user_id,
          form_data,
          feed_style,
          selfie_image_urls,
          strategy_generated,
          strategy_generated_at,
          strategy_data,
          grid_generated,
          grid_generated_at,
          grid_url,
          grid_frame_urls,
          blueprint_completed,
          blueprint_completed_at,
          created_at,
          updated_at
        )
        VALUES (
          ${neonUser.email},
          ${neonUser.display_name || neonUser.email?.split("@")[0] || "User"},
          ${accessToken},
          ${neonUser.id},
          ${formData ? JSON.stringify(formData) : null},
          ${feedStyle || selectedFeedStyle || null},
          ${selfieImages ? JSON.stringify(selfieImages) : null},
          ${strategy?.generated || false},
          ${strategy?.generated ? new Date() : null},
          ${strategy?.data ? JSON.stringify(strategy.data) : null},
          ${grid?.generated || false},
          ${grid?.generated ? new Date() : null},
          ${grid?.gridUrl || null},
          ${grid?.frameUrls ? JSON.stringify(grid.frameUrls) : null},
          ${grid?.generated && strategy?.generated || false},
          ${grid?.generated && strategy?.generated ? new Date() : null},
          NOW(),
          NOW()
        )
      `
    }

    console.log("[Blueprint State] Blueprint state saved for user:", neonUser.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Blueprint State] Error saving blueprint state:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save blueprint state" },
      { status: 500 },
    )
  }
}
