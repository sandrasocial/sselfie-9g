import { NextResponse } from "next/server"

/**
 * GET /api/brand-engine/competitors
 *
 * Returns the list of competitors to track.
 * Used by Make.com competitor scan scenario.
 */
export async function GET() {
  try {
    // TODO: Replace with database fetch or config file
    const competitors = [
      {
        id: "comp-jasmine-star",
        name: "Jasmine Star",
        handle: "@jasminestar",
        platform: "instagram",
        category: "Personal brand + business strategy",
        whyTracking: "Similar audience, strong social presence",
        active: true,
      },
      {
        id: "comp-jenna-kutcher",
        name: "Jenna Kutcher",
        handle: "@jennakutcher",
        platform: "instagram",
        category: "Personal brand + marketing",
        whyTracking: "Excellent storytelling and engagement",
        active: true,
      },
      {
        id: "comp-amy-porterfield",
        name: "Amy Porterfield",
        handle: "@amyporterfield",
        platform: "instagram",
        category: "Digital marketing + online business",
        whyTracking: "Strong educational content and course marketing",
        active: true,
      },
      {
        id: "comp-later",
        name: "Later",
        handle: "@later",
        platform: "instagram",
        category: "Social media tool",
        whyTracking: "Watch how they educate about social media trends",
        active: true,
      },
      {
        id: "comp-honeybook",
        name: "HoneyBook",
        handle: "@honeybook",
        platform: "instagram",
        category: "Business tool for creatives",
        whyTracking: "Aspirational brand aesthetic and systems messaging",
        active: true,
      },
    ]

    return NextResponse.json({
      success: true,
      data: competitors,
      meta: {
        totalCompetitors: competitors.length,
        activeCompetitors: competitors.filter((c) => c.active).length,
      },
    })
  } catch (error) {
    console.error("Error fetching competitors:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch competitors" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/brand-engine/competitors
 *
 * Add a new competitor to track
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // TODO: Save to database
    console.log("New competitor added:", body)

    return NextResponse.json({
      success: true,
      message: "Competitor added",
      competitorId: `comp-${Date.now()}`,
    })
  } catch (error) {
    console.error("Error adding competitor:", error)
    return NextResponse.json(
      { success: false, error: "Failed to add competitor" },
      { status: 500 }
    )
  }
}
