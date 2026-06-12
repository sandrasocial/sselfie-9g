import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"

// SHOOT-STUDIO-01: inspiration image upload (Sandra's Pinterest saves) → Vercel Blob.

export const dynamic = "force-dynamic"
export const maxDuration = 60

const ADMIN_EMAIL = "ssa@ssasocial.com"
const MAX_BYTES = 8 * 1024 * 1024

async function requireAdmin(request?: NextRequest) {
  const bearer = request?.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && bearer === `Bearer ${cronSecret}`) return true
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const form = await request.formData()
    const files = form.getAll("files").filter((f): f is File => f instanceof File)
    if (files.length === 0) {
      return NextResponse.json({ error: "No files attached" }, { status: 400 })
    }
    const urls: string[] = []
    for (const file of files.slice(0, 3)) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: `${file.name} is not an image` }, { status: 400 })
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `${file.name} is over 8MB` }, { status: 400 })
      }
      const ext = file.type.includes("png") ? "png" : "jpg"
      const blob = await put(
        `content-kit/inspiration/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`,
        Buffer.from(await file.arrayBuffer()),
        { access: "public", contentType: file.type },
      )
      urls.push(blob.url)
    }
    return NextResponse.json({ success: true, urls })
  } catch (error: any) {
    console.error("[shoot-studio] upload failed:", error)
    return NextResponse.json({ success: false, error: error?.message || "Upload failed" }, { status: 500 })
  }
}
