/**
 * Check and Fix Stuck Post
 * 
 * This script checks a stuck post's Replicate status and fixes it
 */

import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

async function checkStuckPost(postId: number) {
  try {
    console.log(`\n🔍 Checking stuck post: ${postId}\n`)
    
    // Get post from database
    const posts = await sql`
      SELECT 
        id,
        position,
        prediction_id,
        image_url,
        generation_status,
        prompt,
        user_id,
        feed_layout_id,
        created_at,
        updated_at
      FROM feed_posts
      WHERE id = ${postId}
      LIMIT 1
    ` as any[]
    
    if (posts.length === 0) {
      console.log(`❌ Post ${postId} not found`)
      return
    }
    
    const post = posts[0]
    console.log(`📊 Post Details:`)
    console.log(`   - ID: ${post.id}`)
    console.log(`   - Position: ${post.position}`)
    console.log(`   - Prediction ID: ${post.prediction_id || "NONE"}`)
    console.log(`   - Image URL: ${post.image_url || "NONE"}`)
    console.log(`   - Generation Status: ${post.generation_status}`)
    console.log(`   - Created: ${post.created_at}`)
    console.log(`   - Updated: ${post.updated_at}`)
    console.log("")
    
    if (!post.prediction_id) {
      console.log(`⚠️  Post has no prediction_id - generation may not have started`)
      return
    }
    
    // Check Replicate status
    console.log(`🔍 Checking Replicate prediction: ${post.prediction_id}`)
    const replicate = getReplicateClient()
    
    try {
      const prediction = await replicate.predictions.get(post.prediction_id)
      
      console.log(`\n📊 Replicate Prediction Status:`)
      console.log(`   - Status: ${prediction.status}`)
      console.log(`   - Created: ${prediction.created_at}`)
      console.log(`   - Started: ${prediction.started_at || "N/A"}`)
      console.log(`   - Completed: ${prediction.completed_at || "N/A"}`)
      console.log(`   - Has Output: ${!!prediction.output}`)
      
      if (prediction.output) {
        const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
        console.log(`   - Output URL: ${imageUrl?.substring(0, 80)}...`)
      }
      
      if (prediction.error) {
        console.log(`   - Error: ${prediction.error}`)
      }
      
      if (prediction.logs) {
        console.log(`   - Logs: ${prediction.logs.substring(0, 200)}...`)
      }
      
      console.log("")
      
      // Fix based on status
      if (prediction.status === "succeeded" && prediction.output) {
        const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
        
        if (imageUrl && typeof imageUrl === 'string') {
          console.log(`✅ Prediction succeeded! Updating post with image URL...`)
          
          // Upload to Blob storage
          const { put } = await import("@vercel/blob")
          try {
            const imageResponse = await fetch(imageUrl)
            if (imageResponse.ok) {
              const imageBlob = await imageResponse.blob()
              const blob = await put(`feed-posts/${post.id}.png`, imageBlob, {
                access: "public",
                contentType: "image/png",
                addRandomSuffix: true,
              })
              
              // Update database
              await sql`
                UPDATE feed_posts
                SET 
                  image_url = ${blob.url},
                  generation_status = 'completed',
                  updated_at = NOW()
                WHERE id = ${post.id}
              `
              
              console.log(`✅ Post updated with image URL: ${blob.url}`)
            }
          } catch (blobError: any) {
            console.error(`❌ Failed to upload to Blob:`, blobError.message)
            // Fallback: use Replicate URL directly
            await sql`
              UPDATE feed_posts
              SET 
                image_url = ${imageUrl},
                generation_status = 'completed',
                updated_at = NOW()
              WHERE id = ${post.id}
            `
            console.log(`✅ Post updated with Replicate URL (fallback)`)
          }
        }
      } else if (prediction.status === "failed") {
        console.log(`❌ Prediction failed. Marking post as failed...`)
        
        await sql`
          UPDATE feed_posts
          SET 
            generation_status = 'failed',
            updated_at = NOW()
          WHERE id = ${post.id}
        `
        
        console.log(`✅ Post marked as failed`)
        
        // Refund credits
        try {
          const { addCredits } = await import("@/lib/credits")
          await addCredits(
            post.user_id,
            2, // Pro mode costs 2 credits
            "refund",
            `Refund for failed post ${post.position}`,
            undefined,
            false
          )
          console.log(`✅ Credits refunded`)
        } catch (refundError) {
          console.error(`❌ Failed to refund credits:`, refundError)
        }
      } else if (prediction.status === "canceled") {
        console.log(`⚠️  Prediction was canceled. Marking post as failed...`)
        
        await sql`
          UPDATE feed_posts
          SET 
            generation_status = 'failed',
            updated_at = NOW()
          WHERE id = ${post.id}
        `
        
        console.log(`✅ Post marked as failed`)
      } else {
        console.log(`⏳ Prediction still in progress: ${prediction.status}`)
        console.log(`   This is normal if generation is still running`)
        console.log(`   Polling should continue to check status`)
      }
      
    } catch (replicateError: any) {
      console.error(`❌ Error checking Replicate:`, replicateError.message)
      
      // If prediction doesn't exist, mark as failed
      if (replicateError.status === 404) {
        console.log(`⚠️  Prediction not found in Replicate. Marking post as failed...`)
        
        await sql`
          UPDATE feed_posts
          SET 
            generation_status = 'failed',
            updated_at = NOW()
          WHERE id = ${post.id}
        `
        
        console.log(`✅ Post marked as failed`)
      }
    }
    
  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run script
const postId = process.argv[2] ? parseInt(process.argv[2]) : 2995
checkStuckPost(postId)
  .then(() => {
    console.log(`\n✅ Script completed`)
    process.exit(0)
  })
  .catch((error) => {
    console.error(`\n❌ Script failed:`, error)
    process.exit(1)
  })
