import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { uploadTrainingImages } from "@/lib/storage"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData.getAll("images") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 })
    }

    console.log(`[v0] Uploading ${files.length} training images for user ${neonUser.id}`)

    const imageUrls = await uploadTrainingImages(neonUser.id, files)

    console.log(`[v0] Successfully uploaded ${imageUrls.length} images`)

    return NextResponse.json({
      success: true,
      imageUrls,
      count: imageUrls.length,
    })
  } catch (error) {
    console.error("[v0] Error uploading training images:", error)
    return NextResponse.json({ error: "Failed to upload images" }, { status: 500 })
  }
}
