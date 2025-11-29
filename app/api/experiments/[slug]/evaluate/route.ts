import { type NextRequest, NextResponse } from "next/server"
import { evaluateExperiment } from "@/lib/experiments/abEngine"

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params

    // TODO: Add admin auth check here
    // For now, this is admin-only but not enforced

    const result = await evaluateExperiment(slug)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.results)
  } catch (error) {
    console.error("[API] Error evaluating experiment:", error)
    return NextResponse.json({ error: "Failed to evaluate experiment" }, { status: 500 })
  }
}
