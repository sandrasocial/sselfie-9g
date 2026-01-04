import type { NextRequest } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getDb } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ feedId: string }> | { feedId: string } }) {
  try {
    // Authenticate user first
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.error("[v0] [FEED API] Authentication failed")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      console.error("[v0] [FEED API] User not found")
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    const resolvedParams = await Promise.resolve(params)
    const { feedId } = resolvedParams
    const sql = getDb()

    console.log("[v0] [FEED API] Fetching feed with ID:", feedId, "for user:", user.id)

    if (feedId === "latest") {
      // Reuse the already-authenticated user object (no need to re-authenticate)
      // Get user's most recent feed layout
      const feedLayouts = await sql`
        SELECT * FROM feed_layouts
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 1
      ` as any[]

      if (feedLayouts.length === 0) {
        return Response.json({ exists: false })
      }

      const feedLayout = feedLayouts[0]

      // Get feed posts
      const feedPosts = await sql`
        SELECT * FROM feed_posts
        WHERE feed_layout_id = ${feedLayout.id}
        ORDER BY position ASC
      `

      const bios = await sql`
        SELECT * FROM instagram_bios
        WHERE feed_layout_id = ${feedLayout.id}
        LIMIT 1
      ` as any[]

      const highlights = await sql`
        SELECT * FROM instagram_highlights
        WHERE feed_layout_id = ${feedLayout.id}
        ORDER BY created_at ASC
      ` as any[]

      // Include username and brandName for consistency with /api/feed/latest response format
      const username = feedLayout.username || ""
      const brandName = feedLayout.brand_name || ""
      // Include user's display name
      const userDisplayName = user.display_name || user.name || user.email?.split("@")[0] || "User"

      return Response.json({
        exists: true,
        feed: feedLayout,
        posts: feedPosts,
        bio: bios[0] || null,
        highlights: highlights || [],
        username,
        brandName,
        userDisplayName,
      })
    }

    // Parse feedId as integer
    const feedIdInt = Number.parseInt(feedId, 10)
    if (isNaN(feedIdInt)) {
      console.error("[v0] [FEED API] Invalid feedId format:", feedId)
      return Response.json({ error: "Invalid feed ID format" }, { status: 400 })
    }

    console.log("[v0] [FEED API] Parsed feedId:", feedIdInt)

    // Get feed layout (with user check for security)
    const feedLayouts = await sql`
      SELECT * FROM feed_layouts
      WHERE id = ${feedIdInt}
      AND user_id = ${user.id}
      LIMIT 1
    ` as any[]

    console.log("[v0] [FEED API] Feed layouts found:", feedLayouts.length)

    if (feedLayouts.length === 0) {
      console.error("[v0] [FEED API] Feed not found for ID:", feedIdInt, "user:", user.id)
      return Response.json({ error: "Feed not found" }, { status: 404 })
    }

    const feedLayout = feedLayouts[0]
    console.log("[v0] [FEED API] Feed layout found:", feedLayout.id, "user_id:", feedLayout.user_id)

    // Get feed posts
    let feedPosts = await sql`
      SELECT * FROM feed_posts
      WHERE feed_layout_id = ${feedIdInt}
      ORDER BY position ASC
    ` as any[]

    console.log("[v0] [FEED API] Feed posts found:", feedPosts.length)

    // CRITICAL: Check Replicate status for posts that have prediction_id but no image_url
    // This ensures images ready in Replicate are immediately visible (fixes stuck progress)
    const { getReplicateClient } = await import("@/lib/replicate-client")
    const { put } = await import("@vercel/blob")
    const replicate = getReplicateClient()
    
    const postsToCheck = feedPosts.filter((p: any) => p.prediction_id && !p.image_url)
    if (postsToCheck.length > 0) {
      console.log(`[v0] [FEED API] Checking ${postsToCheck.length} posts with prediction_id but no image_url`)
      
      // Limit to 5 posts per request to avoid rate limits (remaining posts will be checked on next poll)
      const postsToCheckNow = postsToCheck.slice(0, 5)
      for (const post of postsToCheckNow) {
        try {
          const prediction = await replicate.predictions.get(post.prediction_id)
          
          if (prediction.status === "succeeded" && prediction.output) {
            const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
            
            // Validate that imageUrl is a valid string before using it
            if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
              console.error(`[v0] [FEED API] Invalid image URL for post ${post.position}:`, imageUrl)
              continue
            }
            
            console.log(`[v0] [FEED API] ✅ Post ${post.position} completed in Replicate, uploading to Blob...`)
            
            // Upload to Blob storage for permanent URL
            try {
              const imageResponse = await fetch(imageUrl)
              if (imageResponse.ok) {
                const imageBlob = await imageResponse.blob()
                const blob = await put(`feed-posts/${post.id}.png`, imageBlob, {
                  access: "public",
                  contentType: "image/png",
                  addRandomSuffix: true,
                })
                
                // Update database with permanent URL
                await sql`
                  UPDATE feed_posts
                  SET 
                    image_url = ${blob.url},
                    generation_status = 'completed',
                    updated_at = NOW()
                  WHERE id = ${post.id}
                `
                
                // Save to ai_images gallery (like concept cards)
                try {
                  const [postData] = await sql`
                    SELECT prompt, caption, post_type, user_id, position FROM feed_posts WHERE id = ${post.id}
                  `
                  
                  if (postData) {
                    // Check if this image already exists in the gallery
                    const [existing] = await sql`
                      SELECT id FROM ai_images 
                      WHERE prediction_id = ${post.prediction_id} 
                      OR image_url = ${blob.url}
                      LIMIT 1
                    `
                    
                    if (!existing) {
                      const displayCaption = postData.caption || `Feed post ${postData.position}`
                      const fluxPrompt = postData.prompt || ""
                      
                      await sql`
                        INSERT INTO ai_images (
                          user_id,
                          image_url,
                          prompt,
                          generated_prompt,
                          prediction_id,
                          generation_status,
                          source,
                          category,
                          created_at
                        ) VALUES (
                          ${postData.user_id},
                          ${blob.url},
                          ${displayCaption},
                          ${fluxPrompt},
                          ${post.prediction_id},
                          'completed',
                          'feed_planner',
                          ${postData.post_type || 'feed_post'},
                          NOW()
                        )
                      `
                      console.log(`[v0] [FEED API] ✅ Image saved to ai_images gallery for post ${post.position}`)
                    }
                  }
                } catch (galleryError: any) {
                  console.error(`[v0] [FEED API] ❌ Failed to save post ${post.position} to gallery:`, galleryError?.message)
                  // Don't fail the whole request if gallery save fails
                }
                
                // Update local feedPosts array so response includes the new image_url
                const updatedPost = feedPosts.find((p: any) => p.id === post.id)
                if (updatedPost) {
                  updatedPost.image_url = blob.url
                  updatedPost.generation_status = 'completed'
                }
                
                console.log(`[v0] [FEED API] ✅ Post ${post.position} updated with image URL`)
              }
            } catch (blobError) {
              console.error(`[v0] [FEED API] ❌ Failed to upload post ${post.position} to Blob:`, blobError)
              // Fallback: use Replicate URL directly (temporary but works)
              await sql`
                UPDATE feed_posts
                SET 
                  image_url = ${imageUrl},
                  generation_status = 'completed',
                  updated_at = NOW()
                WHERE id = ${post.id}
              `
              
              // Save to ai_images gallery even with fallback URL
              try {
                const [postData] = await sql`
                  SELECT prompt, caption, post_type, user_id, position FROM feed_posts WHERE id = ${post.id}
                `
                
                if (postData) {
                  const [existing] = await sql`
                    SELECT id FROM ai_images 
                    WHERE prediction_id = ${post.prediction_id} 
                    OR image_url = ${imageUrl}
                    LIMIT 1
                  `
                  
                  if (!existing) {
                    const displayCaption = postData.caption || `Feed post ${postData.position}`
                    const fluxPrompt = postData.prompt || ""
                    
                    await sql`
                      INSERT INTO ai_images (
                        user_id,
                        image_url,
                        prompt,
                        generated_prompt,
                        prediction_id,
                        generation_status,
                        source,
                        category,
                        created_at
                      ) VALUES (
                        ${postData.user_id},
                        ${imageUrl},
                        ${displayCaption},
                        ${fluxPrompt},
                        ${post.prediction_id},
                        'completed',
                        'feed_planner',
                        ${postData.post_type || 'feed_post'},
                        NOW()
                      )
                    `
                    console.log(`[v0] [FEED API] ✅ Image saved to ai_images gallery (fallback URL) for post ${post.position}`)
                  }
                }
              } catch (galleryError: any) {
                console.error(`[v0] [FEED API] ❌ Failed to save post ${post.position} to gallery (fallback):`, galleryError?.message)
              }
              
              const updatedPost = feedPosts.find((p: any) => p.id === post.id)
              if (updatedPost) {
                updatedPost.image_url = imageUrl
                updatedPost.generation_status = 'completed'
              }
            }
          } else if (prediction.status === "failed") {
            console.log(`[v0] [FEED API] ❌ Post ${post.position} failed in Replicate`)
            await sql`
              UPDATE feed_posts
              SET 
                generation_status = 'failed',
                updated_at = NOW()
              WHERE id = ${post.id}
            `
            const updatedPost = feedPosts.find((p: any) => p.id === post.id)
            if (updatedPost) {
              updatedPost.generation_status = 'failed'
            }
          }
        } catch (error) {
          console.error(`[v0] [FEED API] Error checking post ${post.position}:`, error)
          // Continue checking other posts
        }
      }
    }

    const bios = await sql`
      SELECT * FROM instagram_bios
      WHERE feed_layout_id = ${feedIdInt}
      LIMIT 1
    ` as any[]

    const highlights = await sql`
      SELECT * FROM instagram_highlights
      WHERE feed_layout_id = ${feedIdInt}
      ORDER BY created_at ASC
    ` as any[]

    // Ensure feedLayout exists before creating response (double-check after all async operations)
    if (!feedLayout || !feedLayout.id) {
      console.error("[v0] [FEED API] Feed layout is null/undefined after query:", {
        feedLayout: feedLayout,
        feedIdInt,
        userId: user.id,
      })
      return Response.json({ error: "Feed layout not found" }, { status: 404 })
    }

    // Ensure we have a valid feed object
    const feedObject = {
      ...feedLayout,
      id: feedLayout.id, // Ensure id is explicitly included
    }

    // Validate feed object has required properties
    if (!feedObject.id) {
      console.error("[v0] [FEED API] Feed object missing id:", feedObject)
      return Response.json({ error: "Invalid feed data structure" }, { status: 500 })
    }

    // Include user's display name
    const userDisplayName = user.display_name || user.name || user.email?.split("@")[0] || "User"

    const response = {
      feed: feedObject,
      posts: feedPosts || [],
      bio: bios && bios.length > 0 ? bios[0] : null,
      highlights: highlights || [],
      userDisplayName,
    }

    console.log("[v0] [FEED API] Returning feed data:", {
      feedId: response.feed.id,
      postsCount: response.posts.length,
      hasBio: !!response.bio,
      highlightsCount: response.highlights.length,
      feedKeys: Object.keys(response.feed),
    })

    // Final validation before returning
    if (!response.feed || !response.feed.id) {
      console.error("[v0] [FEED API] Response validation failed - feed object is invalid:", response)
      return Response.json({ error: "Failed to construct feed response" }, { status: 500 })
    }

    return Response.json(response)
  } catch (error: any) {
    console.error("[v0] Error fetching feed:", error?.message || error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return Response.json({ error: "Failed to load feed. Please try again.", details: errorMessage }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const { feedId } = params
    const body = await req.json()
    const { bio } = body
    const sql = getDb()

    if (!bio || typeof bio !== "string") {
      return Response.json({ error: "Bio is required" }, { status: 400 })
    }

    // Update or insert bio
    const existingBios = await sql`
      SELECT id FROM instagram_bios
      WHERE feed_layout_id = ${feedId}
      LIMIT 1
    ` as any[]

    if (existingBios.length > 0) {
      await sql`
        UPDATE instagram_bios
        SET bio_text = ${bio}
        WHERE feed_layout_id = ${feedId}
      `
    } else {
      // Insert new bio
      await sql`
        INSERT INTO instagram_bios (feed_layout_id, bio_text)
        VALUES (${feedId}, ${bio})
      `
    }

    return Response.json({ success: true, bio })
  } catch (error: any) {
    console.error("[v0] Error updating bio:", error?.message || error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return Response.json({ error: "Internal server error", details: errorMessage }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    console.log("[v0] DELETE feed request for feedId:", params.feedId)
    const { feedId } = params
    const sql = getDb()

    const supabase = await createServerClient()

    const { user: authUser, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !authUser) {
      console.error("[v0] DELETE feed auth error:", authError)
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      console.error("[v0] DELETE feed user not found")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Deleting feed for user:", user.id)

    await sql`
      DELETE FROM feed_posts
      WHERE feed_layout_id = ${feedId}
    `
    console.log("[v0] Deleted feed posts")

    await new Promise((resolve) => setTimeout(resolve, 100))

    await sql`
      DELETE FROM instagram_highlights
      WHERE feed_layout_id = ${feedId}
    `
    console.log("[v0] Deleted highlights")

    await new Promise((resolve) => setTimeout(resolve, 100))

    await sql`
      DELETE FROM instagram_bios
      WHERE feed_layout_id = ${feedId}
    `
    console.log("[v0] Deleted bio")

    await new Promise((resolve) => setTimeout(resolve, 100))

    await sql`
      DELETE FROM feed_layouts
      WHERE id = ${feedId} AND user_id = ${user.id}
    `

    console.log("[v0] Successfully deleted feed:", feedId)
    return Response.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting feed:", error)
    let errorMessage = "Failed to delete feed. Please try again."

    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === "string") {
      errorMessage = error
    } else if (error?.message) {
      errorMessage = String(error.message)
    }

    console.error("[v0] Serialized error message:", errorMessage)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
