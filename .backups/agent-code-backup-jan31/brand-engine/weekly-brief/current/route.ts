import { NextResponse } from "next/server"
import type { WeeklyBrief } from "@/lib/brand-engine/types"

/**
 * GET /api/brand-engine/weekly-brief/current
 *
 * Returns the current week's brief (most recent weekly engine run).
 * Used by daily planning engine and dashboard.
 */
export async function GET() {
  try {
    // TODO: Replace with database fetch
    // For now, return a realistic weekly brief structure
    const currentWeeklyBrief: WeeklyBrief = {
      id: `brief-${Date.now()}`,
      weekOf: getStartOfWeek(),
      whatMattersThisWeek: [
        {
          priority: 1,
          topic: "Launch Brand Engine pilot program",
          reason: "Current focus is to close 1-2 pilot clients",
          suggestedAction: "Share case study content and demo walkthrough posts",
        },
        {
          priority: 2,
          topic: "Address decision fatigue in content",
          reason: "This messaging is performing 2x better in saves and engagement",
          suggestedAction: "Lead with decision fatigue hooks in all content this week",
        },
        {
          priority: 3,
          topic: "New Year planning fatigue moment",
          reason: "Audience is overwhelmed by 'new year, new me' pressure",
          suggestedAction: "Counter with 'consistency over intensity' messaging",
        },
      ],
      contentCalendar: [
        {
          day: "Monday",
          platform: "instagram",
          contentType: "reel",
          pillar: "identity-confidence",
          angle: "Why consistency beats motivation every time",
          cta: "Comment 'ENGINE' to apply for the Brand Engine build",
          priority: "must_post",
        },
        {
          day: "Tuesday",
          platform: "instagram",
          contentType: "carousel",
          pillar: "systems-ai",
          angle: "How the Brand Engine solves decision fatigue",
          cta: "Comment 'ENGINE' to apply for the Brand Engine build",
          priority: "must_post",
        },
        {
          day: "Wednesday",
          platform: "instagram",
          contentType: "reel",
          pillar: "visibility-personal-brand",
          angle: "What to post when you feel invisible",
          cta: "Comment 'SELFIE' for FREE Selfie Brand Blueprint",
          priority: "must_post",
        },
        {
          day: "Thursday",
          platform: "instagram",
          contentType: "story_series",
          pillar: "systems-ai",
          angle: "Behind the scenes: My Brand Engine setup",
          cta: "Poll: Would you want this?",
          priority: "if_time",
        },
        {
          day: "Friday",
          platform: "instagram",
          contentType: "carousel",
          pillar: "identity-confidence",
          angle: "5 signs you're ready to rebuild your brand",
          cta: "Comment 'STUDIO' for a link to SSELFIE STUDIO",
          priority: "must_post",
        },
      ],
      experimentsToRun: [
        "Test posting at 7am vs 12pm for reach comparison",
        "Try 'decision fatigue' in first line of every caption",
      ],
      dontForget: [
        "Respond to all DMs and comments within 2 hours",
        "Review competitor activity on Friday",
        "Update performance data after Friday post",
      ],
      reasoning:
        "Focus on Brand Engine launch content while maintaining audience trust through decision fatigue messaging. Capitalize on New Year fatigue cultural moment. Content calendar balances all 3 pillars with strategic CTAs to move toward pilot client goal.",
      generatedAt: new Date(),
    }

    return NextResponse.json({
      success: true,
      data: currentWeeklyBrief,
      meta: {
        weekOf: currentWeeklyBrief.weekOf,
        generatedAt: currentWeeklyBrief.generatedAt,
      },
    })
  } catch (error) {
    console.error("Error fetching current weekly brief:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch current weekly brief" },
      { status: 500 }
    )
  }
}

/**
 * Helper to get start of current week (Sunday)
 */
function getStartOfWeek(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day
  return new Date(now.setDate(diff))
}
