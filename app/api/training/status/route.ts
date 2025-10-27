import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getLatestTrainedModel, getUserTrainingImages } from "@/lib/data/training"

export async function GET() {
  try {
    console.log("[v0] Training status API called")

    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.log("[v0] Training status: Not authenticated")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("[v0] Training status: Auth user ID:", authUser.id)

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      console.log("[v0] Training status: Neon user not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Training status: Neon user ID:", neonUser.id)

    // Get latest trained model
    const latestModel = await getLatestTrainedModel(neonUser.id)

    // Get training images
    const trainingImages = await getUserTrainingImages(neonUser.id)

    console.log("[v0] Training status response:", {
      hasTrainedModel: !!latestModel,
      modelStatus: latestModel?.training_status,
      imageCount: trainingImages.length,
    })

    return NextResponse.json({
      hasTrainedModel: !!latestModel,
      model: latestModel,
      trainingImages: trainingImages,
      imageCount: trainingImages.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching training status:", error)
    return NextResponse.json({ error: "Failed to fetch training status" }, { status: 500 })
  }
}
