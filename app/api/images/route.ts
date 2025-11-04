import { NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserImages } from "@/lib/data/images"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export async function GET(request: Request) {
  console.log("[v0] Images API: Request received")

  try {
    console.log("[v0] Images API: Getting authenticated user")

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    console.log("[v0] Images API: Auth user", authUser?.id, authError)

    if (authError || !authUser) {
      console.log("[v0] Images API: Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const neonUser = await getUserByAuthId(authUser.id)
    console.log("[v0] Images API: Neon user", neonUser?.id)

    if (!neonUser) {
      console.log("[v0] Images API: User not found in Neon")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const allImages = await getUserImages(neonUser.id)
    console.log("[v0] Images API: Total images fetched", allImages.length)
    console.log("[v0] Images API: Image sources breakdown:", {
      ai_images: allImages.filter((img) => img.source === "ai_images").length,
      generated_images: allImages.filter((img) => img.source === "generated_images").length,
    })

    const paginatedImages = allImages.slice(offset, offset + limit)
    const hasMore = offset + limit < allImages.length

    return NextResponse.json({
      images: paginatedImages,
      hasMore,
      total: allImages.length,
    })
  } catch (error) {
    console.error("[v0] Images API: Error", error)
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 })
  }
}
