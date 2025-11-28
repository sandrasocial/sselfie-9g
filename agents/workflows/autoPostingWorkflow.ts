import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface AutoPostingInput {
  userId?: string
  feedPostId?: number
}

export interface AutoPostingOutput {
  success: boolean
  queuedPosts: number
  errors: string[]
}

/**
 * Auto-Posting Workflow
 * Finds scheduled posts ready to publish and queues them
 */
export async function runWorkflow(input: AutoPostingInput): Promise<AutoPostingOutput> {
  console.log(`[AutoPostingWorkflow] Starting`, input)
  const errors: string[] = []
  let queuedCount = 0

  try {
    // 1. Find ready-to-post feed_posts
    const readyPosts = await sql`
      SELECT 
        fp.id as feed_post_id,
        fp.user_id,
        fp.feed_layout_id as feed_id,
        fp.image_url,
        fp.caption,
        fp.scheduled_at
      FROM feed_posts fp
      WHERE fp.scheduled_at <= NOW()
        AND fp.posted_at IS NULL
        AND fp.post_status != 'draft'
        AND fp.generation_status = 'completed'
        ${input.userId ? sql`AND fp.user_id = ${input.userId}` : sql``}
        ${input.feedPostId ? sql`AND fp.id = ${input.feedPostId}` : sql``}
      LIMIT 100
    `

    console.log(`[AutoPostingWorkflow] Found ${readyPosts.length} ready posts`)

    // 2. Insert into queue (check for duplicates first)
    for (const post of readyPosts) {
      try {
        const [existing] = await sql`
          SELECT id FROM instagram_post_queue
          WHERE feed_post_id = ${post.feed_post_id}
            AND status IN ('pending', 'ready', 'processing')
          LIMIT 1
        `

        if (existing) {
          console.log(`[AutoPostingWorkflow] Post ${post.feed_post_id} already queued, skipping`)
          continue
        }

        await sql`
          INSERT INTO instagram_post_queue (
            user_id,
            feed_id,
            feed_post_id,
            image_url,
            caption,
            scheduled_at,
            status
          ) VALUES (
            ${post.user_id},
            ${post.feed_id},
            ${post.feed_post_id},
            ${post.image_url},
            ${post.caption || ""},
            ${post.scheduled_at},
            'ready'
          )
        `

        queuedCount++
        console.log(`[AutoPostingWorkflow] Queued post ${post.feed_post_id}`)
      } catch (err) {
        const errorMsg = `Failed to queue post ${post.feed_post_id}: ${err instanceof Error ? err.message : "Unknown error"}`
        errors.push(errorMsg)
        console.error(`[AutoPostingWorkflow] ${errorMsg}`)
      }
    }

    return {
      success: true,
      queuedPosts: queuedCount,
      errors,
    }
  } catch (error) {
    console.error(`[AutoPostingWorkflow] Fatal error:`, error)
    return {
      success: false,
      queuedPosts: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    }
  }
}

/**
 * Mark a queued post as successfully posted
 */
export async function markAsPosted(queueId: string, userId: string) {
  try {
    // Update queue status
    await sql`
      UPDATE instagram_post_queue
      SET status = 'posted', posted_at = NOW()
      WHERE id = ${queueId} AND user_id = ${userId}
    `

    // Update feed_posts.posted_at
    const [queue] = await sql`
      SELECT feed_post_id FROM instagram_post_queue
      WHERE id = ${queueId}
    `

    if (queue) {
      await sql`
        UPDATE feed_posts
        SET posted_at = NOW(), post_status = 'published'
        WHERE id = ${queue.feed_post_id}
      `
    }

    console.log(`[AutoPostingWorkflow] Marked queue ${queueId} as posted`)
    return { success: true }
  } catch (error) {
    console.error(`[AutoPostingWorkflow] Error marking as posted:`, error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown" }
  }
}
