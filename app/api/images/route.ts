import { NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserImages } from "@/lib/data/images"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export async function GET(request: Request) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(authUser.id)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { images: paginatedImages, total } = await getUserImages(neonUser.id, limit, offset)
    const hasMore = offset + limit < total

    return NextResponse.json({
      images: paginatedImages,
      hasMore,
      total,
    })
  } catch (error) {
    console.error("[v0] Images API: Error", error)
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 })
  }
}
