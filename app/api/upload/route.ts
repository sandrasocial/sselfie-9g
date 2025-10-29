import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-sync"

export async function POST(request: Request) {
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
    // </CHANGE>

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    // </CHANGE>

    const blob = await put(`uploads/${neonUser.id}/${Date.now()}-${file.name}`, file, {
      access: "public",
    })

    console.log("[v0] Image uploaded to Blob:", blob.url)
    // </CHANGE>

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] Error uploading image:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}
