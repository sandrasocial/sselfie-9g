import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

export async function DELETE(request: Request) {
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

    const { imageId } = await request.json()

    console.log("[v0] Delete image - imageId:", imageId, "type:", typeof imageId)

    const sql = neon(process.env.DATABASE_URL!)

    const imageIdStr = String(imageId)
    const isAiImage = imageIdStr.startsWith("ai_")

    const numericId = isAiImage
      ? Number.parseInt(imageIdStr.replace("ai_", ""))
      : Number.parseInt(imageIdStr.replace("gen_", ""))

    console.log("[v0] Delete image - isAiImage:", isAiImage, "numericId:", numericId)

    if (isAiImage) {
      // Delete from ai_images table (integer ID)
      console.log("[v0] Deleting from ai_images table")
      await sql`
        DELETE FROM ai_images 
        WHERE id = ${numericId} AND user_id = ${neonUser.id}
      `
    } else {
      // Delete from generated_images table (integer ID)
      console.log("[v0] Deleting from generated_images table")
      await sql`
        DELETE FROM generated_images 
        WHERE id = ${numericId} AND user_id = ${neonUser.id}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting image:", error)
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 })
  }
}
