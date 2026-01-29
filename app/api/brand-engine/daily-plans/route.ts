import { NextResponse } from "next/server"
import type { TodaysPlan } from "@/lib/brand-engine/types"
import { voiceCheck } from "@/lib/brand-engine"

/**
 * GET /api/brand-engine/daily-plans
 *
 * Returns recent daily plans.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    // TODO: Replace with database fetch
    const todaysPlan: TodaysPlan = {
      id: `plan-${Date.now()}`,
      date: date ? new Date(date) : new Date(),
      whatToPostToday: [
        {
          platform: "instagram",
          contentType: "reel",
          angle: "Why consistency beats motivation every time",
          hook: "I used to think I needed more motivation. I didn't.",
          cta: "Comment 'ENGINE' to apply for the Brand Engine build",
          timing: "12:00 PM EST",
          whyThisToday:
            "Monday energy - people are trying to start fresh. Counter with realistic consistency message.",
        },
      ],
      storiesToPost: [
        {
          type: "personal_moment",
          content: "Coffee + planning my week (show planner or setup)",
          timing: "Morning",
        },
        {
          type: "poll",
          content: "Quick poll: What's harder - motivation or consistency?",
          timing: "Afternoon",
        },
        {
          type: "cta_reminder",
          content: "Still have 2 Brand Engine pilot spots open - comment ENGINE if interested",
          timing: "Evening",
        },
      ],
      engagementPriorities: [
        "Respond to all comments on yesterday's post",
        "Check DMs for 'ENGINE' keyword triggers",
        "Engage with 5 target audience accounts",
      ],
      reasoning:
        "Leading with consistency message aligns with weekly priority and counters New Year pressure. Stories maintain presence and move toward pilot client goal.",
      generatedAt: new Date(),
    }

    return NextResponse.json({
      success: true,
      data: todaysPlan,
    })
  } catch (error) {
    console.error("Error fetching daily plan:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch daily plan" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/brand-engine/daily-plans
 *
 * Save a new daily plan (from Make.com daily engine)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Voice check on caption drafts if present
    let voiceCheckResults: any[] = []
    if (body.caption_drafts && Array.isArray(body.caption_drafts)) {
      voiceCheckResults = body.caption_drafts.map((draft: any) => {
        const caption = typeof draft === "string" ? draft : draft.content || draft.caption || ""
        const check = voiceCheck(caption)
        return {
          caption: caption.substring(0, 100) + "...", // Preview
          voiceCheckPassed: check.passed,
          warnings: check.warnings,
        }
      })

      // Log voice check results
      const failedChecks = voiceCheckResults.filter((r) => !r.voiceCheckPassed)
      if (failedChecks.length > 0) {
        console.warn(
          `⚠️ ${failedChecks.length}/${voiceCheckResults.length} captions failed voice check`,
          failedChecks
        )
      } else {
        console.log(`✅ All ${voiceCheckResults.length} captions passed voice check`)
      }
    }

    // TODO: Save to database
    console.log("New daily plan received:", {
      date: body.date,
      hasTodaysPlan: !!body.todays_plan,
      hasCaptionDrafts: !!body.caption_drafts,
      voiceChecksPassed: voiceCheckResults.filter((r) => r.voiceCheckPassed).length,
      voiceChecksFailed: voiceCheckResults.filter((r) => !r.voiceCheckPassed).length,
    })

    return NextResponse.json({
      success: true,
      message: "Daily plan saved",
      planId: `plan-${Date.now()}`,
      voiceCheckResults,
    })
  } catch (error) {
    console.error("Error saving daily plan:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save daily plan" },
      { status: 500 }
    )
  }
}
