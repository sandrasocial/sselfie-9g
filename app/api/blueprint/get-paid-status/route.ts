import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
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
 * GET /api/blueprint/get-paid-status
 * 
 * Check paid blueprint purchase and generation status
 * Query params: access (optional if admin) - access_token from blueprint_subscribers
 * Admin users can access without token or with any token
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const accessToken = searchParams.get("access")
    const userIsAdmin = await isAdmin()

    // Admin can access without token - try to find their own paid blueprint by email
    if (userIsAdmin && !accessToken) {
      try {
        const supabase = await createServerClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const neonUser = await getUserByAuthId(user.id)
          if (neonUser?.email) {
            // Lookup admin's own paid blueprint by email
            const adminSubscriber = await sql`
              SELECT 
                id,
                email,
                user_id,
                access_token,
                paid_blueprint_purchased,
                paid_blueprint_purchased_at,
                paid_blueprint_generated,
                paid_blueprint_generated_at,
                paid_blueprint_photo_urls,
                selfie_image_urls,
                form_data,
                feed_style
              FROM blueprint_subscribers
              WHERE email = ${neonUser.email}
              AND paid_blueprint_purchased = TRUE
              ORDER BY paid_blueprint_purchased_at DESC
              LIMIT 1
            `

            if (adminSubscriber.length > 0) {
              console.log("[v0][paid-blueprint] Admin auto-access: Found paid blueprint for admin email")
              const data = adminSubscriber[0]
              const photoUrls = Array.isArray(data.paid_blueprint_photo_urls) ? data.paid_blueprint_photo_urls : []
              const completedUrls = photoUrls.filter((url: any) => url !== null && url !== undefined)
              const completedCount = completedUrls.length
              const percentage = Math.round((completedCount / 30) * 100)
              const missingGridNumbers: number[] = []
              for (let i = 0; i < 30; i++) {
                if (!photoUrls[i]) {
                  missingGridNumbers.push(i + 1)
                }
              }
              // FIX: Check selfies from user_avatar_images table (not blueprint_subscribers.selfie_image_urls)
              let hasSelfies = false
              let userId: string | null = data.user_id || neonUser.id || null
              
              if (userId) {
                const avatarImages = await sql`
                  SELECT COUNT(*) as count
                  FROM user_avatar_images
                  WHERE user_id = ${userId}
                    AND image_type = 'selfie'
                    AND is_active = true
                  LIMIT 1
                `
                hasSelfies = (avatarImages[0]?.count || 0) > 0
              } else {
                // Fallback: Check legacy selfie_image_urls field
                hasSelfies = Array.isArray(data.selfie_image_urls) && 
                  data.selfie_image_urls.some((url: any) => typeof url === "string" && url.startsWith("http"))
              }
              const formData = data.form_data || {}
              const hasFormData = !!(formData.vibe || data.feed_style)

              return NextResponse.json({
                purchased: true,
                generated: data.paid_blueprint_generated || false,
                generatedAt: data.paid_blueprint_generated_at || null,
                totalPhotos: completedCount,
                photoUrls: completedUrls,
                canGenerate: true,
                progress: {
                  completed: completedCount,
                  total: 30,
                  percentage,
                },
                missingGridNumbers,
                hasSelfies,
                hasFormData,
                error: null,
                admin: true,
                accessToken: data.access_token, // Return token for frontend to use
              })
            }
          }
        }
      } catch (adminError) {
        console.error("[v0][paid-blueprint] Error checking admin's paid blueprint:", adminError)
      }

      console.log("[v0][paid-blueprint] Admin access - no token and no paid blueprint found for admin email")
      return NextResponse.json({
        admin: true,
        message: "Admin access granted. No paid blueprint found for your email. Provide ?access=TOKEN to view a specific subscriber.",
      })
    }

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { error: "Access token is required" }, 
        { status: 400 }
      )
    }

    console.log("[v0][paid-blueprint] Checking status for token:", accessToken.substring(0, 8) + "...")

    // Get subscriber data by access_token
    const subscriber = await sql`
      SELECT 
        id,
        email,
        user_id,
        paid_blueprint_purchased,
        paid_blueprint_purchased_at,
        paid_blueprint_generated,
        paid_blueprint_generated_at,
        paid_blueprint_photo_urls,
        selfie_image_urls,
        form_data,
        feed_style
      FROM blueprint_subscribers
      WHERE access_token = ${accessToken}
      LIMIT 1
    `

    if (subscriber.length === 0) {
      // Admin can still access (for testing with invalid tokens)
      if (userIsAdmin) {
        console.log("[v0][paid-blueprint] Admin access - invalid token, but allowing admin override")
        return NextResponse.json({
          admin: true,
          error: "Invalid access token",
          message: "Admin override: Token not found, but admin access granted.",
        })
      }

      console.log("[v0][paid-blueprint] Invalid access token")
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 404 },
      )
    }

    const data = subscriber[0]
    const photoUrls = Array.isArray(data.paid_blueprint_photo_urls) ? data.paid_blueprint_photo_urls : []
    
    // Count completed grids (non-null URLs)
    const completedUrls = photoUrls.filter((url: any) => url !== null && url !== undefined)
    const completedCount = completedUrls.length
    const percentage = Math.round((completedCount / 30) * 100)

    // Find missing grid numbers (null or undefined slots)
    const missingGridNumbers: number[] = []
    for (let i = 0; i < 30; i++) {
      if (!photoUrls[i]) {
        missingGridNumbers.push(i + 1)  // Grid numbers are 1-indexed
      }
    }

    // Check if has prerequisites
    // FIX: Check selfies from user_avatar_images table (not blueprint_subscribers.selfie_image_urls)
    let hasSelfies = false
    let userId: string | null = data.user_id || null
    
    if (!userId) {
      // Fallback: Look up user by email
      const userByEmail = await sql`
        SELECT id FROM users WHERE email = ${data.email} LIMIT 1
      `
      userId = userByEmail.length > 0 ? userByEmail[0].id : null
    }
    
    if (userId) {
      const avatarImages = await sql`
        SELECT COUNT(*) as count
        FROM user_avatar_images
        WHERE user_id = ${userId}
          AND image_type = 'selfie'
          AND is_active = true
        LIMIT 1
      `
      hasSelfies = (avatarImages[0]?.count || 0) > 0
    } else {
      // Fallback: Check legacy selfie_image_urls field (for backward compatibility)
      hasSelfies = Array.isArray(data.selfie_image_urls) && 
        data.selfie_image_urls.some((url: any) => typeof url === "string" && url.startsWith("http"))
    }
    const formData = data.form_data || {}
    const hasFormData = !!(formData.vibe || data.feed_style)

    console.log("[v0][paid-blueprint] Status:", {
      email: data.email.substring(0, 3) + "***",
      purchased: data.paid_blueprint_purchased,
      generated: data.paid_blueprint_generated,
      completedCount,
      percentage,
    })

    return NextResponse.json({
      purchased: data.paid_blueprint_purchased || false,
      generated: data.paid_blueprint_generated || false,
      generatedAt: data.paid_blueprint_generated_at || null,
      totalPhotos: completedCount,
      photoUrls: completedUrls,  // Only return non-null URLs
      canGenerate: (data.paid_blueprint_purchased && !data.paid_blueprint_generated) || false,
      progress: {
        completed: completedCount,
        total: 30,
        percentage,
      },
      missingGridNumbers,  // For retry UI
      hasSelfies,
      hasFormData,
      error: null,
      admin: userIsAdmin, // Indicate if admin access
    })
  } catch (error) {
    console.error("[v0][paid-blueprint] Error getting status:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 },
    )
  }
}
