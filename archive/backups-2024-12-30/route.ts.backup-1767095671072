import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { submitExercise } from "@/lib/data/academy"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { exerciseId, answer } = body

    console.log("[v0] Submit exercise:", { exerciseId, answerLength: answer?.length })

    if (!exerciseId || !answer) {
      return NextResponse.json({ error: "Missing exerciseId or answer" }, { status: 400 })
    }

    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Submit exercise
    const submission = await submitExercise(neonUser.id, Number.parseInt(exerciseId), answer)

    console.log("[v0] Exercise submitted:", submission)

    return NextResponse.json({
      success: true,
      submission,
    })
  } catch (error) {
    console.error("[v0] Error submitting exercise:", error)
    return NextResponse.json({ error: "Failed to submit exercise" }, { status: 500 })
  }
}
