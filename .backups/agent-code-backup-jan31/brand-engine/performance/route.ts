import { NextResponse } from "next/server"
import type { PerformanceData } from "@/lib/brand-engine/types"

/**
 * GET /api/brand-engine/performance
 *
 * Returns performance data (post metrics, insights, experiments).
 * In v1, this returns placeholder data. Connect to Instagram Insights later.
 */
export async function GET() {
  try {
    // TODO: Replace with database fetch or Instagram API
    const performance: PerformanceData = {
      posts: [
        {
          postId: "post-1",
          platform: "instagram",
          postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          contentPillar: "identity-confidence",
          contentType: "reel",
          metrics: {
            views: 2500,
            likes: 180,
            comments: 24,
            shares: 12,
            saves: 45,
            engagementRate: 10.4,
          },
          performance: "winner",
          whyItWorked: "Hook directly addressed decision fatigue, strong CTA",
        },
        {
          postId: "post-2",
          platform: "instagram",
          postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          contentPillar: "systems-ai",
          contentType: "carousel",
          metrics: {
            views: 1200,
            likes: 85,
            comments: 8,
            shares: 5,
            saves: 32,
            engagementRate: 5.2,
          },
          performance: "average",
        },
      ],
      insights: [
        {
          id: "insight-1",
          type: "pattern",
          title: "Decision fatigue hooks outperform",
          description: "Posts that directly mention 'decision fatigue' or 'overwhelm' in the first line get 2x saves",
          confidence: 85,
          dataPoints: 8,
          timeframe: "Last 30 days",
          suggestedAction: "Use decision fatigue language in hooks more consistently",
          generatedAt: new Date(),
        },
        {
          id: "insight-2",
          type: "winner",
          title: "Talking head Reels winning",
          description: "15-30 second talking head reels with captions performing 3x better than static posts",
          confidence: 90,
          dataPoints: 12,
          timeframe: "Last 30 days",
          suggestedAction: "Shift content mix to 60% Reels",
          generatedAt: new Date(),
        },
      ],
      experiments: [
        {
          id: "exp-1",
          hypothesis: "If we post at 7am instead of 12pm, reach will increase because our audience is online during morning routines",
          variable: "Post timing",
          control: "12pm posting",
          test: "7am posting",
          metric: "Reach within 24 hours",
          targetLift: 15,
          status: "running",
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      ],
      weeklyDigest: {
        topPosts: ["post-1"],
        bottomPosts: [],
        keyLearnings: [
          "Decision fatigue messaging resonates strongly",
          "Reels continue to outperform static content",
          "Morning posting experiment showing promise",
        ],
        nextWeekFocus: [
          "Double down on decision fatigue hooks",
          "Test more talking head content",
          "Continue timing experiment",
        ],
      },
      lastAnalyzedAt: new Date(),
    }

    return NextResponse.json({
      success: true,
      data: performance,
    })
  } catch (error) {
    console.error("Error fetching performance:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch performance data" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/brand-engine/performance
 *
 * Add new performance data (from manual upload or API sync)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // TODO: Save to database
    console.log("New performance data received:", body)

    return NextResponse.json({
      success: true,
      message: "Performance data saved",
    })
  } catch (error) {
    console.error("Error saving performance:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save performance data" },
      { status: 500 }
    )
  }
}
