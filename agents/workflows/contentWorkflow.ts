import { neon } from "@neondatabase/serverless"
import { dailyContentAgent } from "../content/dailyContentAgent"
import { generateWeeklySummary } from "../tools/analyticsEmailTools"

const sql = neon(process.env.DATABASE_URL!)

export interface WorkflowInput {
  topic?: string
  contentType?: "reel" | "carousel" | "story" | "hook" | "caption" | "auto"
  context?: any
}

export interface WorkflowOutput {
  success: boolean
  draftId?: string
  content?: any
  analytics?: any
  recommendation?: string
  error?: string
}

/**
 * Content Workflow
 * Analyzes last 7 days of email analytics to determine best content type,
 * generates content using DailyContentAgent, and saves draft to database
 */
export async function runWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  console.log("[ContentWorkflow] Starting content generation workflow", input)

  try {
    // Step 1: Pull analytics from last 7 days
    const analyticsResult = await generateWeeklySummary()

    if (!analyticsResult.success) {
      console.error("[ContentWorkflow] Failed to get analytics:", analyticsResult.error)
      return {
        success: false,
        error: "Failed to fetch analytics data",
      }
    }

    const analytics = analyticsResult.data

    // Step 2: Determine best content type based on performance
    let contentType = input.contentType || "auto"
    let recommendation = ""

    if (contentType === "auto") {
      // Analyze what performed best
      const bestCampaigns = analytics.best_campaigns || []
      const avgOpenRate = analytics.overall?.open_rate || 0

      // Simple heuristic: if open rate > 40%, generate educational carousel
      // If 25-40%, generate reel
      // If < 25%, generate hook
      if (avgOpenRate > 40) {
        contentType = "carousel"
        recommendation = "High engagement detected. Generating educational carousel to maintain momentum."
      } else if (avgOpenRate > 25) {
        contentType = "reel"
        recommendation = "Moderate engagement. Generating reel for higher reach and retention."
      } else {
        contentType = "hook"
        recommendation = "Lower engagement. Generating strong hooks to improve scroll-stopping power."
      }

      console.log(`[ContentWorkflow] Auto-selected content type: ${contentType} (open rate: ${avgOpenRate}%)`)
    }

    // Step 3: Generate content using DailyContentAgent
    let content: any
    const topic = input.topic || "personal brand growth on Instagram"

    switch (contentType) {
      case "reel":
        content = await dailyContentAgent.generateDailyReel(topic, {
          analytics,
          ...input.context,
        })
        break
      case "carousel":
        content = await dailyContentAgent.generateDailyCarousel(topic, {
          analytics,
          ...input.context,
        })
        break
      case "story":
        content = await dailyContentAgent.generateDailyStory({
          analytics,
          ...input.context,
        })
        break
      case "hook":
        content = await dailyContentAgent.generateHook(topic)
        break
      case "caption":
        content = await dailyContentAgent.generateCaption(topic, "post", {
          analytics,
          ...input.context,
        })
        break
      default:
        content = await dailyContentAgent.generateDailyReel(topic, {
          analytics,
          ...input.context,
        })
    }

    // Step 4: Save draft to content_drafts table
    const result = await sql`
      INSERT INTO content_drafts (type, title, content_json)
      VALUES (
        ${contentType},
        ${content.title || `${contentType} draft`},
        ${JSON.stringify(content)}
      )
      RETURNING id
    `

    const draftId = result[0]?.id

    console.log(`[ContentWorkflow] Content draft saved with ID: ${draftId}`)

    // Step 5: Return success with draft ID
    return {
      success: true,
      draftId,
      content,
      analytics: {
        overall: analytics.overall,
        best_campaigns: analytics.best_campaigns?.slice(0, 3),
      },
      recommendation,
    }
  } catch (error) {
    console.error("[ContentWorkflow] Workflow failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
