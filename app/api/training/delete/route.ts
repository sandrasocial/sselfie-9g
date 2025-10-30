import { type NextRequest, NextResponse } from "next/server"
import { deleteTrainingImage } from "@/lib/data/training"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { del } from "@vercel/blob"

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get("imageId")
    const imageUrl = searchParams.get("imageUrl")

    if (!imageId) {
      return NextResponse.json({ error: "Image ID is required" }, { status: 400 })
    }

    // Delete from blob storage if URL is provided
    if (imageUrl) {
      try {
        await del(imageUrl)
      } catch (error) {
        console.error("Error deleting from blob storage:", error)
      }
    }

    // Delete from database
    await deleteTrainingImage(Number.parseInt(imageId), user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting training image:", error)
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 })
  }
}
