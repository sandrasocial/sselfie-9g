import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserImages } from "@/lib/data/images"

export async function GET() {
  console.log("[v0] Images API: Request received")

  try {
    const supabase = await createServerClient()
    console.log("[v0] Images API: Supabase client created")

    // Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("[v0] Images API: Auth user", authUser?.id, authError)

    if (authError || !authUser) {
      console.log("[v0] Images API: Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user by auth ID
    const neonUser = await getUserByAuthId(authUser.id)
    console.log("[v0] Images API: Neon user", neonUser?.id)

    if (!neonUser) {
      console.log("[v0] Images API: User not found in Neon")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch user's images from Neon
    const images = await getUserImages(neonUser.id)
    console.log("[v0] Images API: Fetched images count", images.length)

    return NextResponse.json({ images })
  } catch (error) {
    console.error("[v0] Images API: Error", error)
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 })
  }
}
