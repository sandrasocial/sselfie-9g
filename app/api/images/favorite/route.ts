import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { NextResponse, type NextRequest } from "next/server"
import { withAuth } from "@/lib/auth/with-auth"

async function handleFavorite({
  request,
  user: neonUser,
}: {
  request: Request | NextRequest
  user: NonNullable<Awaited<ReturnType<typeof getUserByAuthId>>>
}) {
  try {
    const { imageId, isFavorite } = await request.json()

    console.log("[v0] Favorite image - imageId:", imageId, "type:", typeof imageId, "isFavorite:", isFavorite)


    const imageIdStr = String(imageId)
    const isAiImage = imageIdStr.startsWith("ai_")

    const numericId = isAiImage
      ? Number.parseInt(imageIdStr.replace("ai_", ""))
      : Number.parseInt(imageIdStr.replace("gen_", ""))

    console.log("[v0] Favorite image - isAiImage:", isAiImage, "numericId:", numericId)

    if (isAiImage) {
      console.log("[v0] Updating ai_images table")
      await sql`
        UPDATE ai_images 
        SET is_favorite = ${isFavorite}
        WHERE id = ${numericId} AND user_id = ${neonUser.id}
      `
    } else {
      console.warn("[v0] Attempting to favorite generated_images entry - this shouldn't happen")
      return NextResponse.json({ error: "Invalid image source" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating favorite:", error)
    return NextResponse.json({ error: "Failed to update favorite" }, { status: 500 })
  }
}

export const POST = withAuth(handleFavorite, {
  resolveUser: getUserByAuthId,
})
