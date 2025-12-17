import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"

export const runtime = "edge"

export async function POST(request: Request) {
  console.log("[v0] Generate upload tokens API called")

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const neonUser = await getEffectiveNeonUser(authUser.id)
  if (!neonUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { imageCount } = await request.json()

  if (!imageCount || imageCount < 10 || imageCount > 50) {
    return NextResponse.json({ error: "Invalid image count. Must be between 10 and 50." }, { status: 400 })
  }

  const uploadTokens = []
  for (let i = 0; i < imageCount; i++) {
    const filename = `training/${neonUser.id}/${Date.now()}-${i}.jpg`
    uploadTokens.push({
      index: i,
      filename,
      // Client will use @vercel/blob's handleUpload to upload directly
    })
  }

  console.log(`[v0] Generated ${uploadTokens.length} upload tokens for user ${neonUser.id}`)

  return NextResponse.json({
    uploadTokens,
    userId: neonUser.id,
  })
}
