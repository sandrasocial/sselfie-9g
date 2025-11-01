import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

const ADMIN_EMAIL = "ssa@ssasocial.com"

// Get gallery images for content calendar
export async function GET(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser || authUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const category = searchParams.get("category")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    let query = supabase.from("generated_images").select("*").order("created_at", { ascending: false }).limit(limit)

    if (userId) {
      query = query.eq("user_id", Number.parseInt(userId))
    }

    if (category) {
      query = query.eq("content_category", category)
    }

    const { data: images, error } = await query

    if (error) throw error

    return NextResponse.json({ images })
  } catch (error) {
    console.error("[v0] Gallery images fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch gallery images" }, { status: 500 })
  }
}

// Update image metadata for better categorization
export async function PATCH(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser || authUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { imageId, category, tags } = await request.json()

    const { error } = await supabase
      .from("generated_images")
      .update({
        content_category: category,
        content_tags: tags,
      })
      .eq("id", imageId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Image metadata update error:", error)
    return NextResponse.json({ error: "Failed to update image metadata" }, { status: 500 })
  }
}
