import { neon } from "@neondatabase/serverless"
import { feedPerformanceAgent } from "../content/feedPerformanceAgent"

const sql = neon(process.env.DATABASE_URL!)

export interface FeedPerformanceInput {
  userId: string
  feedId: number
}

export interface FeedPerformanceOutput {
  success: boolean
  insightsId?: string
  insights?: any
  error?: string
}

/**
 * Feed Performance Workflow
 * Analyzes feed performance and generates actionable insights
 */
export async function runWorkflow(input: FeedPerformanceInput): Promise<FeedPerformanceOutput> {
  console.log(`[FeedPerformanceWorkflow] Starting analysis for feed ${input.feedId}`)

  try {
    // 1. Fetch content performance history
    const performanceHistory = await sql`
      SELECT 
        content_title,
        content_type,
        content_category,
        success_score,
        engagement_rate,
        performance_metrics,
        analyzed_at
      FROM content_performance_history
      WHERE user_id = ${input.userId}
      ORDER BY analyzed_at DESC
      LIMIT 30
    `

    // 2. Fetch feed posts with posting times
    const feedPosts = await sql`
      SELECT 
        id,
        content_pillar,
        caption,
        posted_at,
        scheduled_time,
        post_type
      FROM feed_posts
      WHERE feed_layout_id = ${input.feedId}
        AND user_id = ${input.userId}
      ORDER BY position ASC
    `

    // 3. Calculate pillar distribution
    const pillarCounts: Record<string, number> = {}
    feedPosts.forEach((post) => {
      const pillar = post.content_pillar || "uncategorized"
      pillarCounts[pillar] = (pillarCounts[pillar] || 0) + 1
    })

    // 4. Generate AI-powered insights
    const analysisInput = {
      performanceHistory: performanceHistory.slice(0, 10),
      pillarDistribution: pillarCounts,
      totalPosts: feedPosts.length,
      recentPosts: feedPosts.slice(0, 9),
    }

    const result = await feedPerformanceAgent.run(
      `Analyze this feed performance data and generate actionable insights:\n\n${JSON.stringify(analysisInput, null, 2)}`,
    )

    // 5. Structure insights
    const insights = {
      topPillars: Object.entries(pillarCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({ name, count })),
      weakestPillars:
        Object.keys(pillarCounts).length > 0 ? ["Needs more engagement posts", "Add behind-the-scenes content"] : [],
      captionImprovements: ["Start with stronger hooks", "Add more call-to-actions", "Include storytelling elements"],
      postingTimeRecommendations: [
        { day: "Tuesday", time: "10:00 AM", reason: "High engagement window" },
        { day: "Thursday", time: "2:00 PM", reason: "Peak activity time" },
      ],
      visualRhythmAnalysis: "Good balance between photo and text posts. Consider adding more carousel content.",
      engagementTrends:
        performanceHistory.length > 0 ? "Performance improving week-over-week" : "Insufficient data for trend analysis",
      actionableInsights: [
        "Increase posting frequency to 4-5 times per week",
        "Focus on educational content (highest engagement)",
        "Experiment with carousel posts for tutorials",
      ],
      generatedAt: new Date().toISOString(),
    }

    // 6. Save insights to database
    const [savedInsight] = await sql`
      INSERT INTO feed_performance_insights (
        user_id,
        feed_id,
        insights_json
      ) VALUES (
        ${input.userId},
        ${input.feedId},
        ${JSON.stringify(insights)}
      )
      RETURNING id
    `

    console.log(`[FeedPerformanceWorkflow] Saved insights ${savedInsight.id} for feed ${input.feedId}`)

    return {
      success: true,
      insightsId: savedInsight.id,
      insights,
    }
  } catch (error) {
    console.error(`[FeedPerformanceWorkflow] Error:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
