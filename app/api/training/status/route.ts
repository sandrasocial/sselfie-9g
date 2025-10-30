import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
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

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const latestModel = await getLatestTrainedModel(neonUser.id)
    const trainingImages = await getUserTrainingImages(neonUser.id)

    return NextResponse.json({
      hasTrainedModel: !!latestModel,
      model: latestModel,
      trainingImages: trainingImages,
      imageCount: trainingImages.length,
    })
  } catch (error) {
    console.error("Error fetching training status:", error)
    return NextResponse.json({ error: "Failed to fetch training status" }, { status: 500 })
  }
}
