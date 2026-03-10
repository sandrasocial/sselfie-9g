import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { listPersonalPagesForUser } from "@/lib/maya/personal-pages"

export async function GET(_request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const pages = await listPersonalPagesForUser(neonUser.id, 30)
    const serializedPages = pages
      .filter((page) => page.page_type === "calendar")
      .map((page) => ({
      id: page.id,
      title: page.title || "Untitled",
      pageType: page.page_type,
      status: page.status,
      liveUrl: page.live_url || `/p/${page.owner_slug}/${page.slug}`,
      ownerSlug: page.owner_slug,
      slug: page.slug,
      version: page.version,
      updatedAt: page.updated_at,
      }))

    return NextResponse.json({
      success: true,
      pages: serializedPages,
    })
  } catch (error) {
    console.error("[Maya Personal Pages] Error:", error)
    return NextResponse.json({ error: "Failed to load personal pages" }, { status: 500 })
  }
}
