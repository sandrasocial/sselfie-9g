import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params

    // Fetch experiment
    const [experiment] = await sql`
      SELECT * FROM funnel_experiments WHERE slug = ${slug}
    `

    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 })
    }

    // Fetch performance stats
    const eventsA = await sql`
      SELECT event FROM funnel_ab_events
      WHERE experiment_id = ${experiment.id} AND variant = 'A'
    `

    const eventsB = await sql`
      SELECT event FROM funnel_ab_events
      WHERE experiment_id = ${experiment.id} AND variant = 'B'
    `

    // Calculate metrics
    const viewsA = eventsA.filter((e: any) => e.event === "view").length
    const submitsA = eventsA.filter((e: any) => e.event === "submit").length
    const conversionsA = eventsA.filter((e: any) => e.event === "conversion").length

    const viewsB = eventsB.filter((e: any) => e.event === "view").length
    const submitsB = eventsB.filter((e: any) => e.event === "submit").length
    const conversionsB = eventsB.filter((e: any) => e.event === "conversion").length

    return NextResponse.json({
      experiment,
      performance: {
        A: {
          views: viewsA,
          submits: submitsA,
          conversions: conversionsA,
          submitRate: viewsA > 0 ? ((submitsA / viewsA) * 100).toFixed(1) + "%" : "0%",
          conversionRate: viewsA > 0 ? ((conversionsA / viewsA) * 100).toFixed(1) + "%" : "0%",
        },
        B: {
          views: viewsB,
          submits: submitsB,
          conversions: conversionsB,
          submitRate: viewsB > 0 ? ((submitsB / viewsB) * 100).toFixed(1) + "%" : "0%",
          conversionRate: viewsB > 0 ? ((conversionsB / viewsB) * 100).toFixed(1) + "%" : "0%",
        },
      },
    })
  } catch (error) {
    console.error("[API] Error fetching experiment:", error)
    return NextResponse.json({ error: "Failed to fetch experiment" }, { status: 500 })
  }
}
