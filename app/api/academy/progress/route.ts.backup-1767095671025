import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { updateLessonProgress, markLessonComplete } from "@/lib/data/academy"

// POST - Update watch time for video lessons
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { lessonId, watchTimeSeconds } = body

    console.log("[v0] Update lesson progress:", { lessonId, watchTimeSeconds })

    if (!lessonId || watchTimeSeconds === undefined) {
      return NextResponse.json({ error: "Missing lessonId or watchTimeSeconds" }, { status: 400 })
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

    // Update progress
    const progress = await updateLessonProgress(neonUser.id, Number.parseInt(lessonId), watchTimeSeconds)

    console.log("[v0] Progress updated:", progress)

    return NextResponse.json({
      success: true,
      progress,
    })
  } catch (error) {
    console.error("[v0] Error updating progress:", error)
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 })
  }
}

// PATCH - Mark lesson as complete
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { lessonId } = body

    console.log("[v0] Mark lesson complete:", lessonId)

    if (!lessonId) {
      return NextResponse.json({ error: "Missing lessonId" }, { status: 400 })
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

    // Mark as complete
    const progress = await markLessonComplete(neonUser.id, Number.parseInt(lessonId))

    console.log("[v0] Lesson marked complete:", progress)

    return NextResponse.json({
      success: true,
      progress,
    })
  } catch (error) {
    console.error("[v0] Error marking lesson complete:", error)
    return NextResponse.json({ error: "Failed to mark lesson complete" }, { status: 500 })
  }
}
