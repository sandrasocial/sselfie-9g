import { neon } from "@neondatabase/serverless"
import { feedDesignerAgent } from "../content/feedDesignerAgent"

const sql = neon(process.env.DATABASE_URL!)

export interface FeedDesignerInput {
  userId: string
  feedId: number
}

export interface FeedDesignerOutput {
  success: boolean
  recommendations: any
  feedId: number
  error?: string
}

/**
 * Feed Designer Workflow
 * Analyzes a user's feed and provides design recommendations
 */
export async function runWorkflow(input: FeedDesignerInput): Promise<FeedDesignerOutput> {
  console.log(`[FeedDesignerWorkflow] Starting for feed ${input.feedId}`)

  try {
    // 1. Fetch feed layout
    const [layout] = await sql`
      SELECT * FROM feed_layouts 
      WHERE id = ${input.feedId} AND user_id = ${input.userId}
    `

    if (!layout) {
      return {
        success: false,
        recommendations: null,
        feedId: input.feedId,
        error: "Feed not found",
      }
    }

    // 2. Fetch feed posts
    const posts = await sql`
      SELECT id, position, post_type, caption, content_pillar, image_url
      FROM feed_posts
      WHERE feed_layout_id = ${input.feedId} AND user_id = ${input.userId}
      ORDER BY position ASC
    `

    // 3. Fetch feed strategy
    const [strategy] = await sql`
      SELECT * FROM feed_strategy
      WHERE feed_layout_id = ${input.feedId} AND user_id = ${input.userId}
      LIMIT 1
    `

    // 4. Run AI analysis
    const recommendations = await feedDesignerAgent.analyzeFeed({
      layout,
      posts,
      strategy,
    })

    console.log(`[FeedDesignerWorkflow] Generated recommendations for feed ${input.feedId}`)

    return {
      success: true,
      recommendations,
      feedId: input.feedId,
    }
  } catch (error) {
    console.error(`[FeedDesignerWorkflow] Error:`, error)
    return {
      success: false,
      recommendations: null,
      feedId: input.feedId,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
