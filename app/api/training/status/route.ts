import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { getLatestTrainedModel, getUserTrainingImages } from "@/lib/data/training"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const neonUser = await getEffectiveNeonUser(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const latestModel = await getLatestTrainedModel(neonUser.id)
    const trainingImages = await getUserTrainingImages(neonUser.id)
    
    // Get original training image count for retraining validation
    let originalImageCount = null
    if (latestModel) {
      // Try to get the count from the most recent completed training
      // This helps validate retraining quality
      const originalImages = await getUserTrainingImages(neonUser.id)
      originalImageCount = originalImages.length
    }

    return NextResponse.json({
      hasTrainedModel: !!latestModel,
      model: latestModel,
      trainingImages: trainingImages,
      imageCount: trainingImages.length,
      originalImageCount: originalImageCount, // For retraining validation
    })
  } catch (error) {
    console.error("Error fetching training status:", error)
    return NextResponse.json({ error: "Failed to fetch training status" }, { status: 500 })
  }
}
