import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { put } from "@vercel/blob"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { feedId: string } }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const feedId = params.feedId

    // Get all posts with their prediction IDs
    const posts = await sql`
      SELECT id, position, prediction_id, generation_status, image_url, text_overlay
      FROM feed_posts
      WHERE feed_layout_id = ${feedId}
      ORDER BY position ASC
    `

    const replicate = getReplicateClient()
    let completedCount = 0
    let failedCount = 0

    console.log(`[v0] [PROGRESS] Checking ${posts.length} posts for feed ${feedId}`)

    for (const post of posts) {
      if (post.generation_status === "completed") {
        completedCount++
        continue
      }

      // Check any post with prediction_id that doesn't have image_url yet
      // This catches posts that are generating, pending, or stuck
      if (post.prediction_id && !post.image_url) {
        console.log(`[v0] [PROGRESS] Checking post ${post.id} (position ${post.position}) with prediction_id: ${post.prediction_id.substring(0, 20)}...`)
        
        try {
          const prediction = await replicate.predictions.get(post.prediction_id)
          
          console.log(`[v0] [PROGRESS] Post ${post.id} prediction status: ${prediction.status}`)

        if (prediction.status === "succeeded" && prediction.output) {
          const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

          // Validate that imageUrl is a valid string before using it
          if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
            console.error(`[v0] [PROGRESS] Invalid image URL for post ${post.position}:`, imageUrl)
            continue
          }

          // Upload to Blob storage for permanent URL (Replicate URLs are temporary)
          let finalImageUrl = imageUrl
          try {
            // Apply text overlay if needed (this already uploads to Blob)
            if (post.text_overlay) {
              finalImageUrl = await applyTextOverlay(imageUrl, post.text_overlay)
              console.log(`[v0] [PROGRESS] ✅ Image with text overlay uploaded to Blob storage for post ${post.position}`)
            } else {
              // Upload to Blob storage for permanent URL (no text overlay)
              const imageResponse = await fetch(imageUrl)
              if (imageResponse.ok) {
                const imageBlob = await imageResponse.blob()
                const blob = await put(`feed-posts/${post.id}.png`, imageBlob, {
                  access: "public",
                  contentType: "image/png",
                  addRandomSuffix: true,
                })
                finalImageUrl = blob.url
                console.log(`[v0] [PROGRESS] ✅ Image uploaded to Blob storage for post ${post.position}`)
              }
            }
          } catch (blobError: any) {
            console.error(`[v0] [PROGRESS] ❌ Failed to upload to Blob, using Replicate URL (temporary):`, blobError?.message)
            // Note: Using Replicate URL is temporary - it will expire after a few hours
            // This is a fallback, but images may not persist on page refresh
          }

          await sql`
            UPDATE feed_posts
            SET 
              image_url = ${finalImageUrl},
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
                OR image_url = ${finalImageUrl}
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
                    ${finalImageUrl},
                    ${displayCaption},
                    ${fluxPrompt},
                    ${post.prediction_id},
                    'completed',
                    'feed_planner',
                    ${postData.post_type || 'feed_post'},
                    NOW()
                  )
                `
                console.log(`[v0] [PROGRESS] ✅ Image saved to ai_images gallery for post ${post.position}`)
              }
            }
          } catch (galleryError: any) {
            console.error(`[v0] [PROGRESS] ❌ Failed to save post ${post.position} to gallery:`, galleryError?.message)
            // Don't fail the whole request if gallery save fails
          }

          completedCount++
          console.log(`[v0] [PROGRESS] ✅ Post ${post.id} completed, image_url saved`)
        } else if (prediction.status === "failed") {
          await sql`
            UPDATE feed_posts
            SET 
              generation_status = 'failed',
              updated_at = NOW()
            WHERE id = ${post.id}
          `
          failedCount++
          console.log(`[v0] [PROGRESS] ❌ Post ${post.id} failed`)
        } else {
          console.log(`[v0] [PROGRESS] ⏳ Post ${post.id} still processing (status: ${prediction.status})`)
        }
        } catch (error: any) {
          console.error(`[v0] [PROGRESS] ❌ Error checking prediction for post ${post.id}:`, error?.message || error)
          // Continue checking other posts even if one fails
        }
      } else if (post.prediction_id && post.image_url) {
        // Post has prediction_id and image_url - should be completed
        if (post.generation_status !== "completed") {
          console.log(`[v0] [PROGRESS] ⚠️ Post ${post.id} has image_url but status is ${post.generation_status}, fixing...`)
          await sql`
            UPDATE feed_posts
            SET generation_status = 'completed', updated_at = NOW()
            WHERE id = ${post.id}
          `
          completedCount++
        }
      }
    }

    console.log(`[v0] [PROGRESS] Summary: ${completedCount} completed, ${failedCount} failed, ${posts.length - completedCount - failedCount} still processing`)

    return NextResponse.json({
      total: posts.length,
      completed: completedCount,
      failed: failedCount,
      progress: Math.round((completedCount / posts.length) * 100),
      posts: posts.map((p) => ({
        position: p.position,
        status: p.generation_status,
        imageUrl: p.image_url,
      })),
    })
  } catch (error) {
    console.error("[v0] Error checking feed progress:", error)
    return NextResponse.json({ error: "Failed to check progress" }, { status: 500 })
  }
}

async function applyTextOverlay(imageUrl: string, text: string): Promise<string> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl)
    const imageBlob = await response.blob()
    const imageBuffer = await imageBlob.arrayBuffer()

    // Use canvas to apply text overlay
    const { createCanvas, loadImage } = await import("canvas")
    const image = await loadImage(Buffer.from(imageBuffer))

    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext("2d")

    // Draw original image
    ctx.drawImage(image, 0, 0)

    // Apply semi-transparent overlay for text readability
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Configure text style
    const fontSize = Math.floor(canvas.width / 15)
    ctx.font = `bold ${fontSize}px "Playfair Display", serif`
    ctx.fillStyle = "#FFFFFF"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // Word wrap text
    const maxWidth = canvas.width * 0.8
    const words = text.split(" ")
    const lines: string[] = []
    let currentLine = words[0]

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + " " + words[i]
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth) {
        lines.push(currentLine)
        currentLine = words[i]
      } else {
        currentLine = testLine
      }
    }
    lines.push(currentLine)

    // Draw text lines
    const lineHeight = fontSize * 1.4
    const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2

    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, startY + index * lineHeight)
    })

    // Convert to buffer and upload to Blob storage
    const buffer = canvas.toBuffer("image/jpeg", { quality: 0.9 })
    const blob = await put(`feed-images/${Date.now()}-overlay.jpg`, buffer, {
      access: "public",
      contentType: "image/jpeg",
    })

    return blob.url
  } catch (error) {
    console.error("[v0] Error applying text overlay:", error)
    // Return original image if overlay fails
    return imageUrl
  }
}
